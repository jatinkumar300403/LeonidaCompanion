import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Newsletter double opt-in (SPEC §9, D-054). The emailed token is random; the database keeps only
 * its SHA-256 hash, so a leaked table can't confirm anyone. Tokens expire after 7 days.
 */
export const NEWSLETTER_LISTS = ["digest", "online_waitlist"] as const;
export type NewsletterList = (typeof NEWSLETTER_LISTS)[number];
export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateConfirmToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isConfirmTokenExpired(sentAt: string | null, now: number = Date.now()): boolean {
  if (!sentAt) return true;
  const sent = Date.parse(sentAt);
  return Number.isNaN(sent) || now - sent > CONFIRM_TOKEN_TTL_MS;
}

/** A token as it arrives in the confirm link (43 base64url characters). */
export const confirmTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "That link isn't valid.");

export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address.")),
  list: z.enum(NEWSLETTER_LISTS).default("digest"),
});

/** Lists after confirming: what the address already had plus what it was waiting on. */
export function mergeLists(current: readonly string[], pending: readonly string[]): NewsletterList[] {
  const known = new Set<string>(NEWSLETTER_LISTS);
  return [...new Set([...current, ...pending])].filter((list): list is NewsletterList => known.has(list)).sort();
}
