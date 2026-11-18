import { z } from "zod";
import { CLIP_CAPTION_MAX } from "@/config/clips";
import { CLIP_CATEGORIES, type ClipCategory } from "@/config/tags";
import { CLIP_URL_MAX } from "@/lib/clips/parse";

/** Clip input validation (SPEC §6). Mirrors the database checks where they overlap. */

const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const categories = CLIP_CATEGORIES.map((category) => category.value) as [ClipCategory, ...ClipCategory[]];
export const clipCategorySchema = z.enum(categories, "Pick a category.");

const checkbox = z.preprocess((value) => value === true || value === "on" || value === "true", z.boolean());

export const clipUrlSchema = z
  .string("Paste a clip link first.")
  .trim()
  .min(1, "Paste a clip link first.")
  .max(CLIP_URL_MAX, "That link is too long.");

export const clipSubmitSchema = z.object({
  url: clipUrlSchema,
  category: clipCategorySchema,
  caption: z
    .string()
    .trim()
    .max(CLIP_CAPTION_MAX, `Keep the caption under ${CLIP_CAPTION_MAX} characters.`)
    .default(""),
  notSpoiler: checkbox.refine((value) => value, "Confirm the clip isn't a story spoiler or cutscene."),
});
export type ClipSubmitInput = z.infer<typeof clipSubmitSchema>;

export const clipVoteSchema = z.object({
  clipId: id,
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

const reason = z.string().trim().max(500, "Keep the reason under 500 characters.");

export const clipReviewSchema = z.discriminatedUnion("decision", [
  z.object({ id, decision: z.literal("approve"), category: clipCategorySchema.optional() }),
  z.object({ id, decision: z.literal("reject"), reason: reason.min(2, "Give a short reason.") }),
  z.object({ id, decision: z.literal("remove"), reason: reason.min(2, "Give a short reason.") }),
]);
export type ClipReviewInput = z.infer<typeof clipReviewSchema>;

/** First message per field, keyed by field name (for forms). */
export function clipFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
