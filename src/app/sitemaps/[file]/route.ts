import { notFound } from "next/navigation";
import { sectionFromFile, SITEMAP_SECTIONS, urlsetXml, XML_HEADERS } from "@/lib/seo/sitemap";
import { getSitemapEntries } from "@/server/seo/feeds";

/** One section's sitemap: /sitemaps/pages.xml, /sitemaps/tips.xml and so on (SPEC §13, D-096). */
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_SECTIONS.map((section) => ({ file: `${section}.xml` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/sitemaps/[file]">) {
  const section = sectionFromFile((await params).file);
  if (!section) notFound();
  return new Response(urlsetXml(await getSitemapEntries(section)), { headers: XML_HEADERS });
}
