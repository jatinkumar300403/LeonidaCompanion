import type { Role } from "@/config/auth";

/**
 * Forum rules from SPEC §5 (D-061, D-062). The database enforces the same rules in its triggers
 * (supabase/migrations/20261118130000_forum_phase4.sql); these mirrors drive the UI hints and give
 * friendlier messages before a write is refused.
 */

/** Authors edit a thread or post for 30 minutes after posting; mods at any time. */
export const EDIT_WINDOW_MS = 30 * 60_000;

/** New accounts: first 24 hours or reputation under 5. They get 3 threads and 20 replies a day. */
export const NEW_ACCOUNT = {
  ageMs: 24 * 3_600_000,
  minReputation: 5,
  threadsPerDay: 3,
  postsPerDay: 20,
} as const;

/** Links in posts unlock at 20 reputation (and once the account is a day old). */
export const LINKS_MIN_REPUTATION = 20;

/** Rate-limit trust tier (SPEC §5 "no rate-limit warning at rep ≥ 100"). */
export const TRUSTED_REPUTATION = 100;

/** Thread title and body limits (SPEC §5; the database checks the same). */
export const THREAD_LIMITS = { titleMin: 10, titleMax: 140, bodyMin: 20, bodyMax: 20_000, tagsMax: 5 } as const;
export const POST_LIMITS = { bodyMin: 2, bodyMax: 20_000 } as const;

/**
 * Anything markdown renders as a link: http(s) URLs, www. autolinks, [text](url), <scheme:…>
 * autolinks and reference definitions. Same pattern as private.contains_link() in SQL.
 */
const LINK_PATTERN = /(https?:\/\/|www\.|\]\(|<[a-z][a-z0-9+.-]*:|^\s{0,3}\[[^\]]+\]:)/im;

export function containsLink(markdown: string): boolean {
  return LINK_PATTERN.test(markdown);
}

export type ForumMember = { role: Role | string; reputation: number; createdAt: string };

export function isStaff(role: string | null | undefined): boolean {
  return role === "mod" || role === "admin";
}

function ageMs(createdAt: string, now: number): number {
  const created = Date.parse(createdAt);
  return Number.isFinite(created) ? now - created : 0;
}

export function isNewAccount(member: ForumMember, now: number = Date.now()): boolean {
  if (isStaff(member.role)) return false;
  return ageMs(member.createdAt, now) < NEW_ACCOUNT.ageMs || member.reputation < NEW_ACCOUNT.minReputation;
}

export function canPostLinks(member: ForumMember, now: number = Date.now()): boolean {
  if (isStaff(member.role)) return true;
  return ageMs(member.createdAt, now) >= NEW_ACCOUNT.ageMs && member.reputation >= LINKS_MIN_REPUTATION;
}

/** When the author's edit window closes (epoch ms). */
export function editableUntil(createdAt: string): number {
  return Date.parse(createdAt) + EDIT_WINDOW_MS;
}

/** Can this person edit the content now? Authors within the window, staff any time. */
export function canEdit(
  item: { createdAt: string; authorId: string | null },
  viewer: { id: string; role: string } | null,
  now: number = Date.now(),
): boolean {
  if (!viewer) return false;
  if (isStaff(viewer.role)) return true;
  return item.authorId === viewer.id && now < editableUntil(item.createdAt);
}

/**
 * Read-only categories: locked in the database, or the Online category while FEATURE_ONLINE is
 * off (D-018). Mods may still post in a locked category (the database lets them).
 */
export function isCategoryReadOnly(
  category: { slug: string; isLocked: boolean },
  flags: { FEATURE_ONLINE: boolean },
): boolean {
  return category.isLocked || (category.slug === "online" && !flags.FEATURE_ONLINE);
}

/** Upstash scope for a new thread or reply: rep ≥ 100 gets the larger "Trusted" budget (D-063). */
export function writeLimitScope(
  kind: "thread" | "post",
  reputation: number,
): "forumThread" | "forumThreadTrusted" | "forumPost" | "forumPostTrusted" {
  const trusted = reputation >= TRUSTED_REPUTATION;
  if (kind === "thread") return trusted ? "forumThreadTrusted" : "forumThread";
  return trusted ? "forumPostTrusted" : "forumPost";
}

/** D-017 thin-thread noindex: no replies and a body under 200 characters, at any age. */
export function isThinThread(thread: { replyCount: number; bodyMd: string }): boolean {
  return thread.replyCount === 0 && thread.bodyMd.length < 200;
}
