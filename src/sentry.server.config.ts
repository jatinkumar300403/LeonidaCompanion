import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/monitoring/options";

/** Sentry for the Node.js runtime. Loaded by src/instrumentation.ts only when a DSN is set (D-093). */
Sentry.init(sentryInitOptions());
