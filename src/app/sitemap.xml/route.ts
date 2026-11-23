import { siteConfig } from "@/config/site";
import { absoluteUrl, newestLastmod, SITEMAP_SECTIONS, sitemapIndexXml, XML_HEADERS } from "@/lib/seo/sitemap";
import { getSitemapEntries } from "@/server/seo/feeds";

/**
 * Sitemap index (SPEC §13, D-096): one sitemap per section under /sitemaps/<section>.xml, each with
 * its newest lastmod. Next 16 doesn't build an index for split sitemaps, so this is a route.
 */
export const revalidate = 3600;

export async function GET() {
  const sections = await Promise.all(
    SITEMAP_SECTIONS.map(async (section) => ({
      url: absoluteUrl(siteConfig.url, `/sitemaps/${section}.xml`),
      lastModified: newestLastmod(await getSitemapEntries(section)),
    })),
  );
  return new Response(sitemapIndexXml(sections), { headers: XML_HEADERS });
}
