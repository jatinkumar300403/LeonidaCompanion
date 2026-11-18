import { plainText } from "@/lib/articles/content";

/**
 * A one-line plain-text excerpt for thread lists. Spoilers never leak: complete `||…||` pairs
 * become "[spoiler]", and an unclosed `||` (the stored excerpt is cut at 280 characters) drops
 * everything after it.
 */
export function threadExcerpt(markdown: string | null | undefined, max = 160): string {
  if (!markdown) return "";
  let source = markdown.replace(/\|\|[\s\S]*?\|\|/g, " [spoiler] ");
  const open = source.indexOf("||");
  if (open !== -1) source = `${source.slice(0, open)} [spoiler]`;
  const text = plainText(source);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}
