import { isAllowedThumbnailHost } from "@/config/clips";

/** Keeps a thumbnail URL only when it is https on an allowlisted CDN (D-071); otherwise null. */
export function safeThumbnailUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 1000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && isAllowedThumbnailHost(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Trims platform text to what the database accepts (titles 1–200, names ≤ 100). */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
