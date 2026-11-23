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
