import { z } from "zod";
import {
  ARTICLE_TYPES,
  BODY_MAX,
  FACT_STATUS_VALUES,
  QUICK_TIP,
  SOURCES_MAX,
  SPOILER_LEVEL_VALUES,
  SUMMARY_MAX,
  TAGS_MAX,
  TITLE_MAX,
} from "@/config/articles";
import { TAGS } from "@/config/tags";
import { isValidSlug, SLUG_MAX } from "@/lib/articles/slug";

/**
 * Article input validation (SPEC §4, CLAUDE.md rule 7). Mirrors the database checks so the editor
 * shows a clear message before Postgres refuses a row.
 */

const tagSlugs = TAGS.map((tag) => tag.slug) as [string, ...string[]];

const trimmed = (max: number, label: string) =>
  z.string().trim().max(max, `${label} can be at most ${max} characters.`);

export const webUrl = z
  .string()
  .trim()
  .max(2000, "That link is too long.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full link starting with https://");

export const sourceSchema = z.object({
  title: trimmed(200, "Source title").min(1, "Give the source a title."),
  url: webUrl,
  accessed_at: z.iso.date("Use a date like 2026-11-19."),
});
export type ArticleSource = z.infer<typeof sourceSchema>;

export const tagsSchema = z
  .array(z.enum(tagSlugs, "Unknown tag."))
  .max(TAGS_MAX, `Pick at most ${TAGS_MAX} tags.`)
  .transform((tags) => [...new Set(tags)]);

export const spoilerLevelSchema = z.enum(SPOILER_LEVEL_VALUES);
export const factStatusSchema = z.enum(FACT_STATUS_VALUES);

const slugSchema = z
  .string()
  .trim()
  .max(SLUG_MAX)
  .refine((slug) => slug === "" || isValidSlug(slug), "Use lowercase letters, numbers and single dashes.");

/** Quick Tip mode (SPEC §10): title + 2–5 sentences + optional source + tags + spoiler level. */
export const quickTipSchema = z.object({
  title: trimmed(TITLE_MAX, "The title").min(5, "Give the tip a title (5+ characters)."),
  body: z
    .string()
    .trim()
    .min(QUICK_TIP.bodyMin, "Write at least a couple of sentences.")
    .max(QUICK_TIP.bodyMax, `Quick tips are at most ${QUICK_TIP.bodyMax} characters. Use full mode for more.`),
  sourceUrl: z.union([z.literal(""), webUrl]).default(""),
  tags: tagsSchema.default([]),
  spoilerLevel: spoilerLevelSchema.default("none"),
});
export type QuickTipInput = z.infer<typeof quickTipSchema>;

/** Full editor input. `intent` decides the status change; the rest is the article itself. */
export const articleInputSchema = z
  .object({
    type: z.enum(ARTICLE_TYPES),
    title: trimmed(TITLE_MAX, "The title").min(1, "Add a title."),
    slug: slugSchema.default(""),
    summary: trimmed(SUMMARY_MAX, "The summary").default(""),
    body: z.string().max(BODY_MAX, "The body is too long.").default(""),
    tags: tagsSchema.default([]),
    spoilerLevel: spoilerLevelSchema.default("none"),
    factStatus: z.union([z.literal(""), factStatusSchema]).default(""),
    sources: z.array(sourceSchema).max(SOURCES_MAX, `At most ${SOURCES_MAX} sources.`).default([]),
    coverImageUrl: z.union([z.literal(""), webUrl]).default(""),
    /** ISO instant for a scheduled publish, or "" for "now". */
    publishAt: z.union([z.literal(""), z.iso.datetime({ offset: true })]).default(""),
  })
  .superRefine((article, ctx) => {
    if (article.type !== "fact" && article.factStatus) {
      ctx.addIssue({ code: "custom", path: ["factStatus"], message: "Only facts have a fact status." });
    }
  });
export type ArticleInput = z.infer<typeof articleInputSchema>;

/**
 * What publishing needs on top of a valid draft (SPEC §4 required fields, rule 7 for facts).
 * Returns field → message, empty when the article can go live.
 */
export function publishProblems(article: ArticleInput): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!article.summary) problems.summary = "Add a summary (it's the Google description).";
  if (!article.body.trim()) problems.body = "Write the article before publishing.";
  if (article.type === "fact") {
    if (!article.factStatus) problems.factStatus = "Facts need a status: confirmed, verified or community.";
    if (article.factStatus === "confirmed" && article.sources.length === 0) {
      problems.sources = "A confirmed fact needs its official source.";
    }
    if (article.factStatus === "verified" && article.sources.length < 2) {
      problems.sources = "A verified fact needs at least two sources.";
    }
  }
  return problems;
}

/** Cover images must come from our own article-images bucket. */
export function isOwnCoverUrl(url: string, supabaseUrl: string | undefined): boolean {
  if (!url || !supabaseUrl) return false;
  return url.startsWith(`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/article-images/`);
}

/** zod issues → { field: first message } for the editor. */
export function articleFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * The plain arguments the CMS actions take besides the form (Phase 10, D-102): an article id, the
 * save intent and the status change. Server actions are public endpoints, so these are checked
 * like any other input rather than trusted from their TypeScript types.
 */
export const articleIdSchema = z.uuid();
export const saveIntentSchema = z.enum(["autosave", "draft", "review", "publish", "schedule", "update"]);
export const statusActionSchema = z.enum(["unpublish", "archive", "restore"]);
