"use server";

import { siteConfig } from "@/config/site";
import { newsletterConfirmEmail } from "@/emails/newsletter-confirm";
import { confirmTokenSchema, generateConfirmToken, hashConfirmToken, subscribeSchema } from "@/lib/newsletter/token";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { confirmSubscription, requestSubscription } from "@/server/admin/newsletter";
import { isTestIdentity } from "@/server/admin/test-auth";
import { requestContext } from "@/server/auth/request";
import { verifyTurnstileForm } from "@/server/auth/turnstile";
import { sendEmail } from "@/server/email/send";
import { isNewsletterEnabled } from "@/server/newsletter/status";

/**
 * Newsletter + Online waitlist double opt-in (SPEC §9, D-054). The reply never says whether an
 * address is already subscribed, so the form can't be used to look people up.
 */
export type SubscribeState =
  { status: "idle" } | { status: "sent"; message: string } | { status: "error"; message: string; fieldError?: string };

const SENT: SubscribeState = {
  status: "sent",
  message: "Check your inbox: we sent a link to confirm. Nothing is sent until you click it.",
};

export async function subscribeToNewsletter(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  if (!isNewsletterEnabled()) return { status: "error", message: "Sign-ups open soon." };

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email") ?? "",
    list: formData.get("list") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address.", fieldError: "Enter a valid email address." };
  }
  const { email, list } = parsed.data;
  const { ip, origin } = await requestContext();

  // Dev test identities (D-044/D-046) skip limits and Turnstile, like the sign-in form.
  if (!isTestIdentity(email)) {
    for (const check of await Promise.all([rateLimit("newsletterIp", ip), rateLimit("newsletterEmail", email)])) {
      if (!check.success) return { status: "error", message: rateLimitMessage(check.retryAfterSeconds) };
    }
    const turnstile = await verifyTurnstileForm(formData, ip);
    if (!turnstile.ok) return { status: "error", message: turnstile.error };
  }

  try {
    const token = generateConfirmToken();
    const result = await requestSubscription(email, list, hashConfirmToken(token));
    if (result === "already_subscribed") return SENT;

    const link = new URL("/newsletter/confirm", origin);
    link.searchParams.set("token", token);
    const sent = await sendEmail({
      to: email,
      kind: "newsletter",
      link: link.toString(),
      content: newsletterConfirmEmail({
        siteName: siteConfig.name,
        confirmUrl: link.toString(),
        list,
        disclaimer: siteConfig.disclaimer,
      }),
    });
    if (!sent) return { status: "error", message: "We couldn't send the confirmation email. Please try again later." };
    return SENT;
  } catch (error) {
    console.error("[newsletter] subscribe failed:", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export type ConfirmState =
  { status: "idle" } | { status: "confirmed"; lists: string[] } | { status: "error"; message: string };

/** Confirms with a POST from the confirm page, so email link scanners can't confirm on their own. */
export async function confirmNewsletter(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const parsed = confirmTokenSchema.safeParse(formData.get("token") ?? "");
  if (!parsed.success) return { status: "error", message: "That confirmation link isn't valid." };
  const { ip } = await requestContext();
  const limit = await rateLimit("newsletterConfirm", ip);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };

  try {
    const result = await confirmSubscription(hashConfirmToken(parsed.data));
    if (result.ok) return { status: "confirmed", lists: result.lists };
    return {
      status: "error",
      message:
        result.reason === "expired"
          ? "That link has expired. Sign up again and we'll send a fresh one."
          : "That link isn't valid any more. It may already have been used.",
    };
  } catch (error) {
    console.error("[newsletter] confirm failed:", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
