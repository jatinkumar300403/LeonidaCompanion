/**
 * Sitemap XML builders (SPEC §13: sitemaps split by section, with lastmod; D-096). Pure: the
 * routes in src/app/sitemap.xml and src/app/sitemaps pass absolute URLs in.
 */
export const SITEMAP_SECTIONS = ["pages", "tips", "features", "facts", "forum", "clips"] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export type SitemapEntry = { url: string; lastModified?: string | null };

/** Google's per-file limit is 50,000 URLs; we stay well under it. */
export const SITEMAP_MAX_URLS = 45_000;

export function isSitemapSection(value: string): value is SitemapSection {
  return (SITEMAP_SECTIONS as readonly string[]).includes(value);
}

/** "tips.xml" → "tips" (the file name used under /sitemaps/). */
export function sectionFromFile(file: string): SitemapSection | null {
  const match = /^([a-z]+)\.xml$/.exec(file);
  return match && isSitemapSection(match[1]!) ? match[1] : null;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A valid W3C datetime, or null for anything unparseable. */
export function toLastmod(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** The newest lastmod among entries (for the index), or null. */
export function newestLastmod(entries: readonly SitemapEntry[]): string | null {
  let newest: number | null = null;
  for (const entry of entries) {
    const lastmod = toLastmod(entry.lastModified);
    if (lastmod && (newest === null || Date.parse(lastmod) > newest)) newest = Date.parse(lastmod);
  }
  return newest === null ? null : new Date(newest).toISOString();
}

function urlElement(tag: "url" | "sitemap", entry: SitemapEntry): string {
  const lastmod = toLastmod(entry.lastModified);
  return `<${tag}><loc>${escapeXml(entry.url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</${tag}>`;
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

export function urlsetXml(entries: readonly SitemapEntry[]): string {
  const seen = new Set<string>();
  const unique = entries.filter((entry) => !seen.has(entry.url) && seen.add(entry.url)).slice(0, SITEMAP_MAX_URLS);
  return `${HEADER}\n<urlset ${NS}>\n${unique.map((entry) => urlElement("url", entry)).join("\n")}\n</urlset>\n`;
}

export function sitemapIndexXml(entries: readonly SitemapEntry[]): string {
  return `${HEADER}\n<sitemapindex ${NS}>\n${entries.map((entry) => urlElement("sitemap", entry)).join("\n")}\n</sitemapindex>\n`;
}

/** "https://example.com" + "/tips/x" → "https://example.com/tips/x". */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, `${siteUrl.replace(/\/+$/, "")}/`).toString();
}

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
} as const;
