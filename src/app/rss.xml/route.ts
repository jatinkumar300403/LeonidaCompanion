import { siteConfig } from "@/config/site";
import { rssXml } from "@/lib/seo/rss";
import { absoluteUrl } from "@/lib/seo/sitemap";
import { getRssItems } from "@/server/seo/feeds";

/** RSS 2.0 feed of the newest spoiler-free tips, features and facts (SPEC §13, D-096). */
export const revalidate = 600;

export async function GET() {
  const xml = rssXml({
    title: `${siteConfig.name}: GTA 6 tips, features and facts`,
    siteUrl: absoluteUrl(siteConfig.url, "/"),
    feedUrl: absoluteUrl(siteConfig.url, "/rss.xml"),
    description: siteConfig.description,
    items: await getRssItems(),
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
