import { z } from "zod";

/**
 * Environment schema for every variable in .env.example (validated on the server at boot).
 * Pure module: parsing has no side effects, so it is unit-tested directly.
 *
 * Rules (D-023, amended by D-027):
 * - Empty values (`KEY=` in .env files) count as unset.
 * - Malformed values always fail fast.
 * - Missing integrations only hide their feature (one warning each), except on a Vercel
 *   Production deployment, where REQUIRED_IN_PRODUCTION must be present.
 */

type RawEnv = Record<string, string | undefined>;

/** Treat "" and whitespace-only values as unset. */
export function normalizeEnv(source: RawEnv): RawEnv {
  const out: RawEnv = {};
  for (const [key, value] of Object.entries(source)) {
    const trimmed = value?.trim();
    out[key] = trimmed ? trimmed : undefined;
  }
  return out;
}

const httpUrl = z.url({ protocol: /^https?$/ });
/** The project URL itself: https://<ref>.supabase.co, with no path such as /rest/v1. */
const supabaseUrl = httpUrl.refine((value) => new URL(value).pathname.replace(/\/+$/, "") === "", {
  message: "must be the project URL (https://<project-ref>.supabase.co) without a path such as /rest/v1",
});
const optionalString = z.string().optional();
const secret = z.string().min(32, "must be at least 32 characters (openssl rand -hex 32)").optional();

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_NAME: optionalString,
  NEXT_PUBLIC_SITE_URL: httpUrl.default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_HOSTS: optionalString,
  NEXT_PUBLIC_SHOW_IMPRESSUM: z.stringbool().default(false),
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: httpUrl.optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.email().optional(),
});

export const serverEnvSchema = publicSchema.extend({
  SITE_COMMERCIAL: z.stringbool().default(true),
  SEED_ADMIN_EMAIL: z.email().optional(),
  ADMIN_EMAIL: z.email().optional(),

  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_PROJECT_REF_DEV: optionalString,
  SUPABASE_PROJECT_REF_PROD: optionalString,
  SUPABASE_ACCESS_TOKEN: optionalString,

  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL_FAST: z.string().default("claude-haiku-5-5"),
  ANTHROPIC_MODEL_SMART: z.string().default("claude-sonnet-5-5"),
  VOYAGE_API_KEY: optionalString,
  VOYAGE_MODEL: z.string().default("voyage-4-lite"),
  ASK_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.45),

  TWITCH_CLIENT_ID: optionalString,
  TWITCH_CLIENT_SECRET: optionalString,
  TWITCH_GTA6_GAME_ID: optionalString,
  YOUTUBE_API_KEY: optionalString,

  UPSTASH_REDIS_REST_URL: httpUrl.optional(),
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  SENTRY_AUTH_TOKEN: optionalString,
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,

  CRON_SECRET: secret,
  ANON_HASH_SALT: secret,

  WIKI_CONTACT_EMAIL: z.email().optional(),
  WIKI_MAX_PAGES_PER_RUN: z.coerce.number().int().positive().default(500),

  INDEXNOW_KEY: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvKey = keyof ServerEnv;

/** Each integration, the variables it needs, and what is hidden while it is missing. */
export const INTEGRATIONS = {
  supabase: {
    label: "Supabase",
    vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    hides: "sign-in and everything stored in the database",
  },
  supabaseAdmin: {
    label: "Supabase secret key",
    vars: ["SUPABASE_SECRET_KEY"],
    hides: "admin tools, cron jobs and wiki sync",
  },
  anthropic: { label: "Anthropic", vars: ["ANTHROPIC_API_KEY"], hides: "Ask AI and AI moderation" },
  voyage: { label: "Voyage AI", vars: ["VOYAGE_API_KEY"], hides: "embeddings for Ask AI" },
  twitch: {
    label: "Twitch",
    vars: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
    hides: "Twitch clip submissions and auto-candidates",
  },
  youtube: { label: "YouTube Data API", vars: ["YOUTUBE_API_KEY"], hides: "YouTube clip submissions" },
  upstash: {
    label: "Upstash Redis",
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    hides: "rate limits and caches",
  },
  turnstile: {
    label: "Cloudflare Turnstile",
    vars: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
    hides: "bot checks on public forms",
  },
  resend: { label: "Resend", vars: ["RESEND_API_KEY", "EMAIL_FROM"], hides: "emails and newsletter sign-ups" },
  sentry: { label: "Sentry", vars: ["NEXT_PUBLIC_SENTRY_DSN"], hides: "error reporting" },
  cron: { label: "Cron secret", vars: ["CRON_SECRET"], hides: "scheduled jobs" },
  anonSalt: {
    label: "Anonymous-id salt",
    vars: ["ANON_HASH_SALT"],
    hides: "anonymous helpful votes and Ask AI limits",
  },
} as const satisfies Record<string, { label: string; vars: readonly EnvKey[]; hides: string }>;

export type IntegrationId = keyof typeof INTEGRATIONS;
export type IntegrationStatus = Record<IntegrationId, boolean>;

/** D-023: what a Vercel Production deployment cannot run without. */
export const REQUIRED_IN_PRODUCTION: readonly IntegrationId[] = [
  "supabase",
  "supabaseAdmin",
  "upstash",
  "turnstile",
  "cron",
  "anonSalt",
];

export class EnvValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid environment variables:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "EnvValidationError";
  }
}

export function getIntegrationStatus(env: Partial<Record<EnvKey, unknown>>): IntegrationStatus {
  const status = {} as IntegrationStatus;
  for (const [id, integration] of Object.entries(INTEGRATIONS) as [
    IntegrationId,
    (typeof INTEGRATIONS)[IntegrationId],
  ][]) {
    status[id] = integration.vars.every((key) => env[key] !== undefined && env[key] !== "");
  }
  return status;
}

export function formatIntegrationWarning(id: IntegrationId): string {
  const { label, vars, hides } = INTEGRATIONS[id];
  return `[env] ${label} not configured (${vars.join(", ")}). Off until it is: ${hides}.`;
}

export type ParsedServerEnv = {
  env: ServerEnv;
  integrations: IntegrationStatus;
  missing: IntegrationId[];
};

/**
 * Validates the raw environment. Error messages name variables, never their values.
 * `productionDeploy` should be true only for a Vercel Production deployment (VERCEL_ENV=production).
 */
export function parseServerEnv(source: RawEnv, { productionDeploy }: { productionDeploy: boolean }): ParsedServerEnv {
  const normalized = normalizeEnv(source);
  const result = serverEnvSchema.safeParse(normalized);
  if (!result.success) {
    throw new EnvValidationError(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  }

  const env = result.data;
  const integrations = getIntegrationStatus(env);
  const missing = (Object.keys(integrations) as IntegrationId[]).filter((id) => !integrations[id]);

  if (productionDeploy) {
    const problems = REQUIRED_IN_PRODUCTION.filter((id) => !integrations[id]).map(
      (id) => `${INTEGRATIONS[id].vars.join(", ")}: required in production (${INTEGRATIONS[id].label})`,
    );
    if (!normalized.NEXT_PUBLIC_SITE_URL || !env.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
      problems.push("NEXT_PUBLIC_SITE_URL: must be set to the https:// production URL");
    }
    if (problems.length > 0) throw new EnvValidationError(problems);
  }

  return { env, integrations, missing };
}
