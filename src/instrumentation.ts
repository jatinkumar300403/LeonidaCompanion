import * as Sentry from "@sentry/nextjs";

/**
 * Runs once when a Next.js server starts. Loading the env module validates every variable at
 * boot and logs one warning per missing integration (CLAUDE.md: env vars validated at boot).
 * Sentry starts only when NEXT_PUBLIC_SENTRY_DSN is set (D-093).
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env");
    if (dsn) await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge" && dsn) {
    await import("./sentry.edge.config");
  }
}

/** Errors from Server Components, route handlers and the proxy. A no-op while Sentry isn't initialised. */
export const onRequestError = Sentry.captureRequestError;
