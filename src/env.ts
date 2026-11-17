import "server-only";
import { formatIntegrationWarning, parseServerEnv } from "@/lib/env/schema";

/**
 * Server environment, validated with zod when this module first loads. src/instrumentation.ts
 * imports it at server start, so a malformed value stops the server at boot.
 * Never import this from a Client Component: use `@/env.client` for NEXT_PUBLIC_* values.
 */
const parsed = parseServerEnv(process.env, {
  productionDeploy: process.env.VERCEL_ENV === "production",
});

// One warning per missing integration, once per server process. Skipped during `next build`,
// where every static-generation worker would repeat them; they appear when the server starts.
const flags = globalThis as typeof globalThis & { __leonidaEnvWarned?: boolean };
if (!flags.__leonidaEnvWarned && process.env.NEXT_PHASE !== "phase-production-build") {
  flags.__leonidaEnvWarned = true;
  for (const id of parsed.missing) {
    console.warn(formatIntegrationWarning(id));
  }
}

export const env = parsed.env;

/** Which optional integrations are configured. Features check this and hide themselves when false. */
export const integrations = parsed.integrations;
