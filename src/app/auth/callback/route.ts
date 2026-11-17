import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { integrations } from "@/env";
import { ONBOARDED_COOKIE } from "@/lib/auth/paths";
import { onboardingPath, safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/server/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>(["email", "magiclink", "signup"]);

/**
 * Finishes sign-in: `code` for OAuth and PKCE magic links, `token_hash` + `type` for links built
 * from the token hash (and the dev test mailbox). Redirects only to a checked same-site `next`, or
 * to /onboarding when the account has no profile yet.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const fail = (reason: string) => {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("error", reason);
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (!integrations.supabase) return fail("unavailable");
  if (params.get("error")) return fail("link");

  const supabase = await createSupabaseServerClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("link");
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail("link");
  } else {
    return fail("link");
  }

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return fail("link");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) return NextResponse.redirect(new URL(onboardingPath(next), request.url));

  (await cookies()).set(ONBOARDED_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.redirect(new URL(next, request.url));
}
