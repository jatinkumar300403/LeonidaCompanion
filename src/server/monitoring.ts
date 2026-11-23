import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Reports an error that was caught and handled (so onRequestError never sees it), with a short
 * label for context. Always logs; sends to Sentry only when it was initialised (DSN set, D-093).
 */
export function captureServerError(label: string, error: unknown): void {
  console.error(`[${label}]`, error instanceof Error ? error.message : error);
  Sentry.captureException(error, { tags: { area: label } });
}
