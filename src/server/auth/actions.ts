"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { integrations } from "@/env";
import { ONBOARDED_COOKIE } from "@/lib/auth/paths";
import { safeNextPath, safeNextRoute, signInPath } from "@/lib/auth/redirect";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { fieldErrors, magicLinkSchema, onboardingSchema } from "@/lib/validation/profile";
import { deliverTestMagicLink, isTestIdentity } from "@/server/admin/test-auth";
import { requestContext } from "@/server/auth/request";
import { getSession } from "@/server/auth/session";
import { verifyTurnstileForm } from "@/server/auth/turnstile";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/server/auth/providers";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const NOT_CONFIGURED = "Sign-in isn't available yet.";

/** Sends a sign-in link (it creates the account on first use). Rate-limited and bot-checked. */
export async function requestMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  if (!integrations.supabase) return { status: "error", message: NOT_CONFIGURED };

  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Check your email address.", fieldErrors: fieldErrors(parsed.error) };
  }

  const { email } = parsed.data;
  const next = safeNextPath(parsed.data.next);
  const { ip, origin } = await requestContext();

  if (isTestIdentity(email)) {
    await deliverTestMagicLink(email, origin, next);
    return { status: "sent", email };
  }

  for (const check of await Promise.all([rateLimit("magicLinkIp", ip), rateLimit("magicLinkEmail", email)])) {
    if (!check.success) return { status: "error", message: rateLimitMessage(check.retryAfterSeconds) };
  }
  const turnstile = await verifyTurnstileForm(formData, ip);
  if (!turnstile.ok) return { status: "error", message: turnstile.error };

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    console.error("[auth] signInWithOtp failed:", error.status, error.code);
    return {
      status: "error",
      message:
        error.status === 429
          ? "Too many sign-in emails right now. Please try again in a few minutes."
          : "We couldn't send the link. Please try again.",
    };
  }
  return { status: "sent", email };
}

/** Starts Google or Discord sign-in. */
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  const next = safeNextPath(formData.get("next"));
  if (!integrations.supabase || !OAUTH_PROVIDERS.includes(provider as OAuthProvider)) redirect(signInPath(next));

  const { origin } = await requestContext();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as OAuthProvider,
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect(`/sign-in?error=provider&next=${encodeURIComponent(next)}` as Route);
  redirect(data.url as Route);
}

export type OnboardingState =
  { status: "idle" } | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** Creates the profile: username, display name, platform, 16+ and terms (SPEC §9). */
export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const next = safeNextPath(formData.get("next"));
  const session = await getSession();
  if (!session) redirect(signInPath("/onboarding"));
  if (session.profile) redirect(safeNextRoute(next));

  const { ip } = await requestContext();
  const limit = await rateLimit("onboarding", session.userId);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };
  const turnstile = await verifyTurnstileForm(formData, ip);
  if (!turnstile.ok) return { status: "error", message: turnstile.error };

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username") ?? "",
    displayName: formData.get("displayName") ?? "",
    platform: formData.get("platform") ?? "",
    ageConfirmed: formData.get("ageConfirmed") ?? undefined,
    termsAccepted: formData.get("termsAccepted") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").insert({
    id: session.userId,
    username: parsed.data.username,
    display_name: parsed.data.displayName,
    platform: parsed.data.platform,
    age_confirmed_at: now,
    terms_accepted_at: now,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "That username is taken.",
        fieldErrors: { username: "That username is taken." },
      };
    }
    if (error.message.includes("username_reserved")) {
      return {
        status: "error",
        message: "That username is reserved.",
        fieldErrors: { username: "That username is reserved." },
      };
    }
    console.error("[auth] profile insert failed:", error.code, error.message);
    return { status: "error", message: "We couldn't create your profile. Please try again." };
  }

  (await cookies()).set(ONBOARDED_COOKIE, session.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNextRoute(next));
}
