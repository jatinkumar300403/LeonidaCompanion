import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ogImagePath } from "@/lib/seo/og";

/**
 * The RSS feed link (SPEC §13). A page's `alternates` replaces the layout's, so every page
 * metadata repeats it alongside its canonical.
 */
export const RSS_ALTERNATE = {
  "application/rss+xml": [{ url: "/rss.xml", title: `${siteConfig.name} guides` }],
};

/**
 * Page title per SPEC §13: "{Title} – GTA 6 {Section}". The root layout's template appends
 * " | {SiteName}". Without a section the title is used as is.
 */
export function pageTitle(title: string, section?: string): string {
  return section ? `${title} – GTA 6 ${section}` : title;
}

type PageMetadataInput = {
  title: string;
  description?: string;
  /** Path for the canonical URL, e.g. "/tips". Resolved against metadataBase. */
  path: string;
  section?: string;
  /** noindex: search, settings, admin, forum/new, held content, thin threads, stubs (SPEC §13). */
  noindex?: boolean;
  /** OG image path; defaults to the dynamic /api/og card for this title and section (SPEC §13). */
  image?: string;
  /** Article pages: OG type "article" with its dates. */
  article?: { publishedTime?: string | null; modifiedTime?: string; tags?: string[] };
};

export function buildMetadata({
  title,
  description,
  path,
  section,
  noindex,
  image,
  article,
}: PageMetadataInput): Metadata {
  const fullTitle = pageTitle(title, section);
  const desc = description || siteConfig.description;
  const ogImage = image ?? ogImagePath(title, section);
  const images = [{ url: ogImage, width: 1200, height: 630, alt: title }];
  const common = {
    title: fullTitle,
    description: desc,
    url: path,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    images,
  };
  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: path, types: RSS_ALTERNATE },
    openGraph: article
      ? {
          ...common,
          type: "article",
          publishedTime: article.publishedTime ?? undefined,
          modifiedTime: article.modifiedTime,
          tags: article.tags,
        }
      : { ...common, type: "website" },
    twitter: { card: "summary_large_image", title: fullTitle, description: desc, images: [ogImage] },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
