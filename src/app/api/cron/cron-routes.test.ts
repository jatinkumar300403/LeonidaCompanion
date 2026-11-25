import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 10: every cron route refuses anything but `Authorization: Bearer ${CRON_SECRET}` before it
 * touches the database or a platform API, and does nothing (says so) without the keys it needs.
 */
const env = { CRON_SECRET: "a-long-test-secret-value" as string | undefined };
const integrations = { supabaseAdmin: false };
const getAdminSupabase = vi.fn();
const twitchDepsFromEnv = vi.fn(() => null);
const freezeWeeklyTop = vi.fn();

vi.mock("@/env", () => ({ env, integrations }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/server/admin/supabase", () => ({ getAdminSupabase }));
vi.mock("@/server/articles/pipeline", () => ({ runPublishPipeline: vi.fn() }));
vi.mock("@/server/admin/clips", () => ({ insertAutoClips: vi.fn(), freezeWeeklyTop }));
vi.mock("@/server/clips/auto", () => ({ fetchTwitchCandidates: vi.fn() }));
vi.mock("@/server/clips/http", () => ({ UpstreamError: class extends Error {} }));
vi.mock("@/server/clips/resolve", () => ({ twitchDepsFromEnv }));

const routes = {
  "publish-scheduled": await import("./publish-scheduled/route"),
  "twitch-clips": await import("./twitch-clips/route"),
  "weekly-clips": await import("./weekly-clips/route"),
};

const call = (name: keyof typeof routes, method: "GET" | "POST", authorization?: string, query = "") => {
  const headers = authorization === undefined ? undefined : { authorization };
  const request = new NextRequest(`http://localhost:3000/api/cron/${name}${query}`, { method, headers });
  return routes[name][method](request);
};

beforeEach(() => {
  env.CRON_SECRET = "a-long-test-secret-value";
  integrations.supabaseAdmin = false;
  vi.clearAllMocks();
});

describe.each(Object.keys(routes) as (keyof typeof routes)[])("/api/cron/%s", (name) => {
  const refused = {
    "no header": undefined,
    "empty header": "",
    "the secret without Bearer": "a-long-test-secret-value",
    "a wrong secret": "Bearer not-the-secret",
    "a longer secret": "Bearer a-long-test-secret-value-plus",
    "a prefix of the secret": "Bearer a-long-test",
    "Basic auth": "Basic YS1sb25nLXRlc3Qtc2VjcmV0LXZhbHVl",
    "the secret in another scheme": "Token a-long-test-secret-value",
  };
  for (const [label, header] of Object.entries(refused)) {
    for (const method of ["GET", "POST"] as const) {
      it(`${method} with ${label} → 401`, async () => {
        const response = await call(name, method, header);
        expect(response.status).toBe(401);
        expect(getAdminSupabase).not.toHaveBeenCalled();
        expect(twitchDepsFromEnv).not.toHaveBeenCalled();
      });
    }
  }

  it("refuses everyone when CRON_SECRET isn't configured", async () => {
    env.CRON_SECRET = undefined;
    expect((await call(name, "GET", "Bearer ")).status).toBe(401);
    expect((await call(name, "GET", "Bearer undefined")).status).toBe(401);
  });

  it("lets the right bearer through (and the scheme's case doesn't matter)", async () => {
    for (const header of ["Bearer a-long-test-secret-value", "bearer a-long-test-secret-value"]) {
      const response = await call(name, "GET", header, name === "weekly-clips" ? "?week=2020-w01" : "");
      expect(response.status).not.toBe(401);
    }
  });
});

describe("without keys", () => {
  const ok = "Bearer a-long-test-secret-value";

  it("twitch-clips skips without the Twitch keys", async () => {
    const body = await (await call("twitch-clips", "GET", ok)).json();
    expect(body).toEqual({ skipped: "Twitch keys missing" });
  });

  it("weekly-clips skips without the service key", async () => {
    const body = await (await call("weekly-clips", "GET", ok)).json();
    expect(body).toEqual({ skipped: "Supabase secret key missing" });
    expect(freezeWeeklyTop).not.toHaveBeenCalled();
  });

  it("weekly-clips refuses a week that isn't over, and a malformed one", async () => {
    integrations.supabaseAdmin = true;
    expect((await call("weekly-clips", "GET", ok, "?week=2099-w01")).status).toBe(400);
    expect((await call("weekly-clips", "GET", ok, "?week=../../etc")).status).toBe(400);
    expect(freezeWeeklyTop).not.toHaveBeenCalled();
  });

  it("publish-scheduled answers 503 without the service key", async () => {
    expect((await call("publish-scheduled", "GET", ok)).status).toBe(503);
  });
});
