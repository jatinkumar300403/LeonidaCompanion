import GithubSlugger from "github-slugger";
import type { FeatureIcon } from "@/types/content";

/**
 * Pure helpers for article bodies (SPEC §4 template). They read markdown as text, so they stay
 * cheap enough to run on every render and in the editor preview.
 */

/** Strips markdown syntax well enough for word counts, summaries and FAQ answers. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}>\s?\[![A-Z]+\]\s*$/gm, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/::youtube\[[^\]]*\]/g, " ")
    .replace(/\|\|/g, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minutes to read at ~220 words a minute, at least 1. */
export function readTimeMinutes(markdown: string): number {
  const words = plainText(markdown).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Headings with the ids rehype-slug gives them (same github-slugger, same order, same text). */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = HEADING.exec(line);
    if (!match) continue;
    const text = headingText(match[2]);
    if (!text) continue;
    // Every heading takes a slug, so later ids stay in step with rehype-slug; the TOC lists H1–H3.
    const id = slugger.slug(text);
    const depth = match[1].length;
    if (depth <= 3) items.push({ id, text, level: depth === 3 ? 3 : 2 });
  }
  return items;
}

/** The text a heading renders: inline markdown stripped, spoilers kept as plain words. */
function headingText(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\|\|/g, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .trim();
}

export type FaqItem = { question: string; answer: string };

/**
 * FAQ pairs for FAQPage JSON-LD (SPEC §4): a `## FAQ` (or "FAQs", "Frequently asked questions")
 * section whose `### Question` headings are each followed by their answer, up to the next H2.
 */
export function extractFaq(markdown: string): FaqItem[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{1,2}\s+(faqs?|frequently asked questions)\s*$/i.test(line.trim()));
  if (start === -1) return [];
  const items: FaqItem[] = [];
  let current: { question: string; answer: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const answer = plainText(current.answer.join("\n"));
    if (current.question && answer) items.push({ question: current.question, answer });
    current = null;
  };
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break;
    const question = /^###\s+(.+?)\s*#*\s*$/.exec(line);
    if (question) {
      flush();
      current = { question: headingText(question[1]), answer: [] };
    } else if (current) {
      current.answer.push(line);
    }
  }
  flush();
  return items;
}

const SENTENCE_END = /[.!?]+(?=\s|$)/g;

/** Rough sentence count for the Quick Tip hint ("2–5 sentences"). */
export function countSentences(text: string): number {
  const plain = plainText(text);
  if (!plain) return 0;
  const ends = plain.match(SENTENCE_END)?.length ?? 0;
  const trailing = /[.!?]["')\]]*$/.test(plain) ? 0 : 1;
  return ends + trailing;
}

/** A meta description from the body: the first sentence(s) that fit in `max` characters. */
export function deriveSummary(body: string, max = 160): string {
  const plain = plainText(body);
  if (plain.length <= max) return plain;
  const sentences = plain.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? [];
  let out = "";
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > max) break;
    out += sentence;
  }
  if (out.trim()) return out.trim();
  const cut = plain.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, "")}…`;
}

/** Orders candidates by how many tags they share with `tags` (then newest first); drops zero overlap. */
export function rankRelated<T extends { id: string; tags: string[]; publishedAt: string | null }>(
  tags: readonly string[],
  candidates: readonly T[],
  { excludeId, limit = 3 }: { excludeId?: string; limit?: number } = {},
): T[] {
  const wanted = new Set(tags);
  return candidates
    .filter((candidate) => candidate.id !== excludeId)
    .map((candidate) => ({ candidate, shared: candidate.tags.filter((tag) => wanted.has(tag)).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.candidate.publishedAt ?? "").localeCompare(a.candidate.publishedAt ?? ""))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

const ICON_BY_TAG: ReadonlyArray<[string, FeatureIcon]> = [
  ["wanted-level", "siren"],
  ["vehicles", "car"],
  ["driving", "car"],
  ["weapons", "crosshair"],
  ["combat", "crosshair"],
  ["money", "wallet"],
  ["heists", "wallet"],
  ["map", "map"],
  ["collectibles", "map"],
  ["social-media", "smartphone"],
  ["settings", "smartphone"],
  ["characters", "users"],
  ["online", "users"],
  ["easter-eggs", "camera"],
  ["activities", "camera"],
];

/** FeatureCard icon from the article's tags (articles have no icon column). */
export function featureIconFor(tags: readonly string[]): FeatureIcon {
  for (const [tag, icon] of ICON_BY_TAG) if (tags.includes(tag)) return icon;
  return "compass";
}
