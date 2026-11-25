/**
 * Invisible-character clean-up for member text (Phase 10, D-101). Bidi overrides and isolates can
 * flip how a name or title reads ("\u202Egnp.exe"), and zero-width characters let a title of nothing
 * pass a minimum length or impersonate another name. They are removed before length checks.
 *
 * Kept on purpose: ZWNJ/ZWJ (U+200C/U+200D), which emoji sequences and Indic or Persian scripts
 * need, and LRM/RLM (U+200E/U+200F), which are harmless marks. Pure and unit-tested.
 */
import { z } from "zod";

// C0 controls except tab/newline/CR, DEL and C1, zero-width space, word joiner, BOM, soft hyphen,
// bidi embeddings and overrides (U+202A–U+202E) and isolates (U+2066–U+2069), and the Unicode
// interlinear and tag characters used to smuggle hidden text.
const INVISIBLE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B\u2060-\u2064\u206A-\u206F\uFEFF\u202A-\u202E\u2066-\u2069\uFFF9-\uFFFB]|\uDB40[\uDC00-\uDC7F]/g;

/** Multi-line text (bodies, bios): invisible characters removed, line breaks kept. */
export function cleanText(value: string): string {
  return value.replace(INVISIBLE, "");
}

/** One-line text (names, titles, captions): also folds tabs and line breaks into single spaces. */
export function cleanLine(value: string): string {
  return cleanText(value).replace(/[\t\r\n]+/g, " ");
}

/** A zod string that is cleaned before any later trim/min/max check runs. */
export const cleanString = () => z.string().overwrite(cleanText);
export const cleanLineString = () => z.string().overwrite(cleanLine);
