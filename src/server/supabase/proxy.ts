import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/env.client";
import { isOnboardingExempt, ONBOARDED_COOKIE } from "@/lib/auth/paths";
import { onboardingPath } from "@/lib/auth/redirect";
import type { Database } from "@/types/database";

const ONBOARDED_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Runs in src/proxy.ts before every page: refreshes the Supabase session cookies (getClaims), and
 * sends signed-in users who haven't finished onboarding to /onboarding (D-038). The profile lookup
 * happens once per session; afterwards the `onboarded_uid` cookie hint skips it. The hint is only
 * a UX shortcut: RLS still requires a profile for every write.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey;
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  // Don't put code between createServerClient and getClaims (Supabase SSR guide).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const hint = request.cookies.get(ONBOARDED_COOKIE)?.value;

  if (!userId) {
    if (hint) response.cookies.delete(ONBOARDED_COOKIE);
    return response;
  }

  const { pathname, search } = request.nextUrl;
  if (hint === userId || isOnboardingExempt(pathname)) return response;

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profile) {
    response.cookies.set(ONBOARDED_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: ONBOARDED_MAX_AGE,
    });
    return response;
  }

  const redirect = NextResponse.redirect(new URL(onboardingPath(`${pathname}${search}`), request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
