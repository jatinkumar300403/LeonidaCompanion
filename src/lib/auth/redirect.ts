/**
 * Open-redirect guard for `?next=` (SPEC §15 QA: no open redirects). Only same-site paths pass;
 * anything else falls back. Pure and unit-tested.
 */
import type { Route } from "next";

const BASE = "http://same.origin.invalid";
const BLOCKED_PREFIXES = ["/auth/", "/api/", "/sign-in", "/onboarding"];

export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value || value.length > 512) return fallback;
  // Must be a path: one leading slash, no protocol-relative "//", no backslashes or control chars.
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  // Dot segments normalise after the check above: "/.//evil.example" becomes "//evil.example",
  // which a browser reads as another host (D-103). Check the normalised path again.
  if (url.pathname.startsWith("//") || url.pathname.includes("\\")) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (
    BLOCKED_PREFIXES.some((prefix) => url.pathname === prefix.replace(/\/$/, "") || url.pathname.startsWith(prefix))
  ) {
    return fallback;
  }
  return path;
}

/** A checked `next` path, typed for redirect() and <Link> under typedRoutes. */
export function safeNextRoute(raw: unknown, fallback = "/"): Route {
  return safeNextPath(raw, fallback) as Route;
}

/** `/sign-in?next=…` for a path the visitor was trying to reach. */
export function signInPath(next?: string): Route {
  const safe = safeNextPath(next, "");
  return (safe && safe !== "/" ? `/sign-in?next=${encodeURIComponent(safe)}` : "/sign-in") as Route;
}

/** `/onboarding?next=…`, keeping where the user was heading. */
export function onboardingPath(next?: string): Route {
  const safe = safeNextPath(next, "");
  return (safe && safe !== "/" ? `/onboarding?next=${encodeURIComponent(safe)}` : "/onboarding") as Route;
}
