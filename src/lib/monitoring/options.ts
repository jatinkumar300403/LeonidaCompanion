/**
 * Shared Sentry settings (SPEC §12, D-093). Sentry stays completely off without
 * NEXT_PUBLIC_SENTRY_DSN: nothing is initialised and the browser never downloads the SDK.
 */
export const sentryDsn: string | undefined = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;

export function sentryInitOptions() {
  return {
    dsn: sentryDsn,
    enabled: Boolean(sentryDsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors always; 10% of requests for performance in production.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    // No IP addresses, cookies or request bodies (privacy page).
    sendDefaultPii: false,
  };
}
