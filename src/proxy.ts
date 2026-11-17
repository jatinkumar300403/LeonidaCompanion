import type { NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/proxy";

/** Next 16 Proxy (formerly middleware): Supabase session refresh + the onboarding redirect. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except build assets, image optimisation and static files.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff2?)$).*)",
  ],
};
