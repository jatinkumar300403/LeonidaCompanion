import { captureInstallEvents } from "@/lib/pwa/install-prompt";
import { loadSentry } from "@/lib/monitoring/client";
import { sentryDsn } from "@/lib/monitoring/options";

/**
 * Runs in the browser before the app becomes interactive (Next.js instrumentation-client).
 * - Captures the PWA install events early, so the install banner never misses them (D-095).
 * - Starts Sentry only when NEXT_PUBLIC_SENTRY_DSN is set, loading the SDK lazily (D-093).
 */
captureInstallEvents();

if (sentryDsn) void loadSentry();

type TransitionArgs = Parameters<typeof import("@sentry/nextjs").captureRouterTransitionStart>;

/** Lets Sentry trace client-side navigations once it has loaded; a no-op without a DSN. */
export function onRouterTransitionStart(...args: TransitionArgs): void {
  if (!sentryDsn) return;
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(...args));
}
