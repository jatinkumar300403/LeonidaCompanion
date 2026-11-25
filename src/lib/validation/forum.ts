import { z } from "zod";
import { REPORT_REASONS, REPORT_TARGETS } from "@/config/forum";
import { TAGS } from "@/config/tags";
import { POST_LIMITS, THREAD_LIMITS } from "@/lib/forum/rules";
import { cleanLineString, cleanString } from "./text";

/**
 * Forum input validation (SPEC §5). Mirrors the database checks so forms show a clear message
 * before Postgres refuses a row.
 */

const tagSlugs = TAGS.map((tag) => tag.slug) as [string, ...string[]];
const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const title = cleanLineString()
  .trim()
  .min(THREAD_LIMITS.titleMin, `Titles need at least ${THREAD_LIMITS.titleMin} characters.`)
  .max(THREAD_LIMITS.titleMax, `Titles can be at most ${THREAD_LIMITS.titleMax} characters.`);

const threadBody = cleanString()
  .trim()
  .min(THREAD_LIMITS.bodyMin, `Add a few more details (at least ${THREAD_LIMITS.bodyMin} characters).`)
  .max(THREAD_LIMITS.bodyMax, `Keep it under ${THREAD_LIMITS.bodyMax.toLocaleString("en")} characters.`);

const postBody = cleanString()
  .trim()
  .min(POST_LIMITS.bodyMin, "Write a reply first.")
  .max(POST_LIMITS.bodyMax, `Keep it under ${POST_LIMITS.bodyMax.toLocaleString("en")} characters.`);

export const threadTagsSchema = z
  .array(z.enum(tagSlugs, "Unknown tag."))
  .transform((tags) => [...new Set(tags)])
  .refine((tags) => tags.length <= THREAD_LIMITS.tagsMax, `Pick at most ${THREAD_LIMITS.tagsMax} tags.`);

const checkbox = z.preprocess((value) => value === true || value === "on" || value === "true", z.boolean());

export const threadInputSchema = z.object({
  categoryId: id,
  title,
  body: threadBody,
  tags: threadTagsSchema.default([]),
  isSpoiler: checkbox.default(false),
});
export type ThreadInput = z.infer<typeof threadInputSchema>;

export const threadEditSchema = z.object({
  threadId: id,
  title,
  body: threadBody,
  tags: threadTagsSchema.default([]),
  isSpoiler: checkbox.default(false),
});
export type ThreadEdit = z.infer<typeof threadEditSchema>;

export const postInputSchema = z.object({
  threadId: id,
  body: postBody,
  replyToPostId: z.preprocess((value) => (value === "" || value == null ? null : value), id.nullable()),
});
export type PostInput = z.infer<typeof postInputSchema>;

export const postEditSchema = z.object({ postId: id, body: postBody });

export const voteSchema = z.object({
  targetType: z.enum(["thread", "post"]),
  targetId: id,
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1).max(200),
  reason: z.enum(REPORT_REASONS.map((reason) => reason.value) as [string, ...string[]], "Pick a reason."),
  details: cleanString().trim().max(2000, "Keep the details under 2,000 characters.").default(""),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const uuidSchema = z.uuid();

/** First message per field, for forms. */
export function forumFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
