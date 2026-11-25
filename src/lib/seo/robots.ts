/** Paths robots.txt keeps out of search (SPEC §13 noindex list; D-096). */
export const ROBOTS_DISALLOW = [
  "/admin",
  "/api/",
  "/auth/",
  "/settings",
  "/onboarding",
  "/sign-in",
  "/forum/new",
  "/clips/submit",
  "/search",
  "/newsletter/",
  "/serwist/",
  "/offline",
] as const;

/**
 * Paths crawlers may fetch despite the `/api/` rule: link-preview images, and the IndexNow key
 * location (src/lib/indexnow.ts), which Bing reads to verify that we own the host (D-113).
 */
export const ROBOTS_ALLOW = ["/", "/api/og", "/api/indexnow"] as const;
