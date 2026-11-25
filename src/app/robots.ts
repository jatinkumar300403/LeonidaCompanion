import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { ROBOTS_ALLOW, ROBOTS_DISALLOW } from "@/lib/seo/robots";
import { absoluteUrl } from "@/lib/seo/sitemap";

/**
 * robots.txt (SPEC §13, D-096). Account, admin, auth, API and form pages stay out of search (they
 * are noindex too); /api/og (link previews) and /api/indexnow (the IndexNow key, D-113) stay
 * crawlable. Vercel Preview deploys block
 * everything, so DEV data never gets indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const previewDeploy = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";
  if (previewDeploy) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: [...ROBOTS_ALLOW], disallow: [...ROBOTS_DISALLOW] },
    sitemap: absoluteUrl(siteConfig.url, "/sitemap.xml"),
  };
}
