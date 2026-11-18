import { createHash } from "node:crypto";

/**
 * Rate-limit keying (SPEC §15 unit test). Identifiers (IP addresses, emails, user ids) are hashed
 * with ANON_HASH_SALT, so Redis never stores them in the clear.
 */

/** Every limit in one place: requests allowed per window. */
export const RATE_LIMITS = {
  magicLinkIp: { limit: 5, window: "15 m" },
  magicLinkEmail: { limit: 3, window: "15 m" },
  usernameCheck: { limit: 60, window: "1 m" },
  onboarding: { limit: 10, window: "1 h" },
  profileUpdate: { limit: 30, window: "1 h" },
  avatarUpload: { limit: 10, window: "1 h" },
  dataExport: { limit: 5, window: "1 d" },
  deleteAccount: { limit: 3, window: "1 h" },
  articleWrite: { limit: 300, window: "1 h" },
  articleAutosave: { limit: 1200, window: "1 h" },
  coverUpload: { limit: 60, window: "1 h" },
  helpfulVoteIp: { limit: 60, window: "1 h" },
  newsletterIp: { limit: 5, window: "1 h" },
  newsletterEmail: { limit: 3, window: "1 d" },
  newsletterConfirm: { limit: 20, window: "1 h" },
  // Forum (Phase 4, D-063). Reputation ≥ 100 gets the "Trusted" tier for threads and replies.
  forumThread: { limit: 10, window: "1 h" },
  forumThreadTrusted: { limit: 30, window: "1 h" },
  forumPost: { limit: 60, window: "1 h" },
  forumPostTrusted: { limit: 200, window: "1 h" },
  forumWriteIp: { limit: 120, window: "1 h" },
  forumEdit: { limit: 60, window: "1 h" },
  forumDelete: { limit: 30, window: "1 h" },
  forumVote: { limit: 300, window: "1 h" },
  forumAccept: { limit: 30, window: "1 h" },
  forumReport: { limit: 10, window: "1 h" },
  forumBlock: { limit: 30, window: "1 h" },
  forumSimilarIp: { limit: 60, window: "1 m" },
  notificationsRead: { limit: 120, window: "1 h" },
  // Clips (Phase 5, D-072). Lookups call the platform APIs, so they're limited per user and per IP.
  clipResolve: { limit: 30, window: "10 m" },
  clipResolveIp: { limit: 60, window: "10 m" },
  clipSubmit: { limit: 10, window: "1 h" },
  clipWriteIp: { limit: 30, window: "1 h" },
  clipVote: { limit: 300, window: "1 h" },
  clipReview: { limit: 600, window: "1 h" },
} as const satisfies Record<string, { limit: number; window: `${number} ${"s" | "m" | "h" | "d"}` }>;

export type RateLimitScope = keyof typeof RATE_LIMITS;

export function hashIdentifier(identifier: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${identifier.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

export function rateLimitKey(scope: RateLimitScope, identifier: string, salt: string): string {
  return `${scope}:${hashIdentifier(identifier, salt)}`;
}

/** The client's IP from proxy headers (Vercel sets x-forwarded-for; the first entry is the client). */
export function clientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || "unknown";
}
