import "server-only";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { trustedOrigin } from "@/lib/auth/origin";
import { clientIp } from "@/lib/ratelimit/keys";

/** The caller's IP (for rate limits and Turnstile) and the trusted origin for auth links. */
export async function requestContext(): Promise<{ ip: string; origin: string }> {
  const h = await headers();
  return {
    ip: clientIp(h),
    origin: trustedOrigin(h, {
      siteUrl: siteConfig.url,
      siteHosts: siteConfig.hosts,
      vercelUrl: process.env.VERCEL_URL,
    }),
  };
}
