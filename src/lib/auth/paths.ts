import type { Role } from "@/config/auth";

/** Cookie the proxy sets once it has seen the user's profile, so it checks only once per session. */
export const ONBOARDED_COOKIE = "onboarded_uid";

/**
 * Paths a signed-in user without a profile may still open: the onboarding page itself, the auth
 * flow, APIs, and the legal pages onboarding links to. Every other page sends them to /onboarding.
 */
const EXEMPT_PREFIXES = ["/onboarding", "/auth/", "/api/", "/sign-in"];
const EXEMPT_PAGES = new Set([
  "/terms",
  "/privacy",
  "/community-guidelines",
  "/disclaimer",
  "/about",
  "/contact",
  "/dmca",
  "/credits",
  "/impressum",
  "/newsletter/confirm",
]);

export function isOnboardingExempt(pathname: string): boolean {
  if (EXEMPT_PAGES.has(pathname)) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true; // files: icons, manifest, robots.txt…
  return EXEMPT_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}

const ROLE_RANK: Record<Role, number> = { user: 0, mod: 1, admin: 2 };

/** True when `role` is at least `required` (admin ⊃ mod ⊃ user). */
export function hasRole(role: string | null | undefined, required: Role): boolean {
  if (role !== "user" && role !== "mod" && role !== "admin") return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** A ban is active while is_banned is set and banned_until is empty (permanent) or in the future. */
export function isBanActive(isBanned: boolean, bannedUntil: string | null, now: Date = new Date()): boolean {
  if (!isBanned) return false;
  return bannedUntil === null || new Date(bannedUntil).getTime() > now.getTime();
}
