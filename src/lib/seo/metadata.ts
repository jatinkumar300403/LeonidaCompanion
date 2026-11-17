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
};

export function buildMetadata({ title, description, path, section, noindex }: PageMetadataInput): Metadata {
  const fullTitle = pageTitle(title, section);
  const desc = description ?? siteConfig.description;
  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description: desc,
      url: path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
