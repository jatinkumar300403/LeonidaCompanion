import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

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
  /** OG image path, e.g. ogImagePath(title, section) → /api/og?… */
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
  const images = image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined;
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
    alternates: { canonical: path },
    openGraph: article
      ? {
          ...common,
          type: "article",
          publishedTime: article.publishedTime ?? undefined,
          modifiedTime: article.modifiedTime,
          tags: article.tags,
        }
      : { ...common, type: "website" },
    twitter: image ? { card: "summary_large_image", title: fullTitle, description: desc, images: [image] } : undefined,
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
