import { track } from "@vercel/analytics";

/**
 * Custom events for Vercel Web Analytics (SPEC §13, D-094). Cookieless; the props are small
 * primitives that describe what happened, never who did it (no ids, emails or free text).
 */
export const ANALYTICS_EVENTS = [
  "ask_submitted",
  "ask_feedback",
  "clip_played",
  "thread_created",
  "post_created",
  "article_helpful",
  "newsletter_signup",
  "pwa_installed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type EventProps = Record<string, string | number | boolean | null | undefined>;

const MAX_KEYS = 6;
const MAX_STRING = 60;

/** Keeps at most 6 primitive props and clips strings, so nothing large or nested is sent. */
export function sanitizeEventProps(props?: EventProps): Record<string, string | number | boolean | null> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (value === undefined) continue;
    if (typeof value === "string") out[key] = value.slice(0, MAX_STRING);
    else if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
    } else out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function isAnalyticsEvent(name: string): name is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}

/** Browser-side event. Never throws: analytics must not break a user action. */
export function trackEvent(name: AnalyticsEvent, props?: EventProps): void {
  try {
    track(name, sanitizeEventProps(props));
  } catch {
    // Ignore: an analytics failure is never the user's problem.
  }
}
