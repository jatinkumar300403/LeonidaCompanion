import { sentryDsn, sentryInitOptions } from "@/lib/monitoring/options";

/**
 * Browser-side Sentry, loaded lazily (D-093). Without a DSN this never imports the SDK, so pages
 * ship no Sentry code. With one, the SDK loads after the page is interactive, which keeps it out of
 * the Lighthouse and JS budgets (SPEC §13). Errors thrown before it loads are not reported.
 */
type SentryModule = typeof import("@sentry/nextjs");

let loading: Promise<SentryModule | null> | null = null;

export function loadSentry(): Promise<SentryModule | null> {
  if (!sentryDsn || typeof window === "undefined") return Promise.resolve(null);
  loading ??= import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init(sentryInitOptions());
      return Sentry;
    })
    .catch(() => null);
  return loading;
}

/** Error boundaries call this; it does nothing without a DSN. */
export function reportClientError(error: unknown): void {
  if (!sentryDsn) return;
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
