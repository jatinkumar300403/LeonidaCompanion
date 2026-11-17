import type { ArticleType } from "@/config/articles";
import { ARTICLE_TYPE_INFO } from "@/config/articles";

/** /api/og parameters (SPEC §13): a title and a section label, both plain text and clamped. */
export const OG_TITLE_MAX = 110;
export const OG_SECTION_MAX = 24;

function clean(value: string | null | undefined, max: number): string {
  const text = (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function parseOgParams(params: URLSearchParams): { title: string; section: string } {
  return { title: clean(params.get("title"), OG_TITLE_MAX), section: clean(params.get("section"), OG_SECTION_MAX) };
}

/** The OG image URL for a page: "/api/og?title=…&section=…". */
export function ogImagePath(title: string, section?: string): string {
  const params = new URLSearchParams({ title: clean(title, OG_TITLE_MAX) });
  if (section) params.set("section", clean(section, OG_SECTION_MAX));
  return `/api/og?${params.toString()}`;
}

export function ogSectionFor(type: ArticleType): string {
  return ARTICLE_TYPE_INFO[type].section;
}
