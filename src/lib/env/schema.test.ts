import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  INTEGRATIONS,
  REQUIRED_IN_PRODUCTION,
  formatIntegrationWarning,
  getIntegrationStatus,
  normalizeEnv,
  parseServerEnv,
} from "./schema";

const SECRET = "a".repeat(64);

/** Every integration configured, as a production deployment would have it. */
const fullEnv = {
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
  SUPABASE_SECRET_KEY: "sk",
  ANTHROPIC_API_KEY: "ak",
  VOYAGE_API_KEY: "vk",
  TWITCH_CLIENT_ID: "tc",
  TWITCH_CLIENT_SECRET: "ts",
  YOUTUBE_API_KEY: "yk",
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "rt",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "tsk",
  TURNSTILE_SECRET_KEY: "tss",
  RESEND_API_KEY: "rk",
  EMAIL_FROM: "Site <hello@example.com>",
  NEXT_PUBLIC_SENTRY_DSN: "https://key@o1.ingest.sentry.io/1",
  CRON_SECRET: SECRET,
  ANON_HASH_SALT: SECRET,
};

describe("normalizeEnv", () => {
  it("treats empty and whitespace-only values as unset", () => {
    expect(normalizeEnv({ A: "", B: "   ", C: " x " })).toEqual({ A: undefined, B: undefined, C: "x" });
  });
});

describe("parseServerEnv", () => {
  it("accepts an empty environment outside production and applies defaults", () => {
    const { env, missing } = parseServerEnv({}, { productionDeploy: false });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.SITE_COMMERCIAL).toBe(true);
    expect(env.NEXT_PUBLIC_SHOW_IMPRESSUM).toBe(false);
    expect(env.ASK_MIN_SCORE).toBe(0.45);
    expect(env.WIKI_MAX_PAGES_PER_RUN).toBe(500);
    expect(env.ANTHROPIC_MODEL_FAST).toBe("claude-haiku-5-5");
    expect(missing).toEqual(Object.keys(INTEGRATIONS));
  });

  it("works with the blank keys of a fresh .env.local", () => {
    const { missing } = parseServerEnv(
      { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", CRON_SECRET: SECRET, ANON_HASH_SALT: SECRET },
      { productionDeploy: false },
    );
    expect(missing).toContain("supabase");
    expect(missing).not.toContain("cron");
    expect(missing).not.toContain("anonSalt");
  });

  it("parses booleans and numbers from strings", () => {
    const { env } = parseServerEnv(
      {
        SITE_COMMERCIAL: "false",
        NEXT_PUBLIC_SHOW_IMPRESSUM: "true",
        ASK_MIN_SCORE: "0.6",
        WIKI_MAX_PAGES_PER_RUN: "200",
      },
      { productionDeploy: false },
    );
    expect(env.SITE_COMMERCIAL).toBe(false);
    expect(env.NEXT_PUBLIC_SHOW_IMPRESSUM).toBe(true);
    expect(env.ASK_MIN_SCORE).toBe(0.6);
    expect(env.WIKI_MAX_PAGES_PER_RUN).toBe(200);
  });

  it("fails fast on malformed values and names the variable, not the value", () => {
    const attempt = () =>
      parseServerEnv(
        { NEXT_PUBLIC_SITE_URL: "not a url", ASK_MIN_SCORE: "2", CRON_SECRET: "short-secret-value" },
        { productionDeploy: false },
      );
    expect(attempt).toThrow(EnvValidationError);
    try {
      attempt();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("NEXT_PUBLIC_SITE_URL");
      expect(message).toContain("ASK_MIN_SCORE");
      expect(message).toContain("CRON_SECRET");
      expect(message).not.toContain("short-secret-value");
    }
  });

  it("rejects non-http URLs", () => {
    expect(() =>
      parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "ftp://x.supabase.co" }, { productionDeploy: false }),
    ).toThrow(EnvValidationError);
  });

  it("rejects a Supabase URL with a path such as /rest/v1, and accepts a trailing slash", () => {
    expect(() =>
      parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/rest/v1/" }, { productionDeploy: false }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL: must be the project URL/);
    expect(
      parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/" }, { productionDeploy: false }).env
        .NEXT_PUBLIC_SUPABASE_URL,
    ).toBe("https://x.supabase.co/");
  });

  it("requires the D-023 set on a production deployment", () => {
    expect(() => parseServerEnv({}, { productionDeploy: true })).toThrow(EnvValidationError);
    try {
      parseServerEnv({}, { productionDeploy: true });
    } catch (error) {
      const problems = (error as EnvValidationError).problems.join("\n");
      for (const id of REQUIRED_IN_PRODUCTION) {
        expect(problems).toContain(INTEGRATIONS[id].vars[0]);
      }
      expect(problems).toContain("NEXT_PUBLIC_SITE_URL");
    }
  });

  it("requires an https site URL in production", () => {
    expect(() =>
      parseServerEnv({ ...fullEnv, NEXT_PUBLIC_SITE_URL: "http://example.com" }, { productionDeploy: true }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("passes in production when everything is set", () => {
    const { missing } = parseServerEnv(fullEnv, { productionDeploy: true });
    expect(missing).toEqual([]);
  });
});

describe("integrations", () => {
  it("counts an integration as configured only when all its variables are set", () => {
    const status = getIntegrationStatus({ UPSTASH_REDIS_REST_URL: "https://r.example.com" });
    expect(status.upstash).toBe(false);
    expect(getIntegrationStatus({ ...fullEnv }).upstash).toBe(true);
  });

  it("formats one warning per integration without values", () => {
    const warning = formatIntegrationWarning("anthropic");
    expect(warning).toContain("ANTHROPIC_API_KEY");
    expect(warning).toContain("Ask AI");
  });
});
