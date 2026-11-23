import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/monitoring/options";

/**
 * Sentry for the Edge runtime. Nothing runs on Edge today (proxy.ts is Node-only in Next 16), but
 * a future edge route gets error reporting without extra setup. Loaded only when a DSN is set.
 */
Sentry.init(sentryInitOptions());
