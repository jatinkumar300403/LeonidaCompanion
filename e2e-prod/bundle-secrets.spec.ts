import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Phase 10 (D-104): nothing server-only reaches the browser. Scans every file the build serves
 * from `/_next/static` for the values of the server secrets (compared in memory, never printed)
 * and for markers of the service-role client. Also checks that the dev-only test mailbox is gone
 * from the production build.
 */
const SECRET_VARS = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "CRON_SECRET",
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "ANON_HASH_SALT",
  "ANTHROPIC_API_KEY",
  "VOYAGE_API_KEY",
  "TWITCH_CLIENT_SECRET",
  "YOUTUBE_API_KEY",
  "RESEND_API_KEY",
  "SENTRY_AUTH_TOKEN",
] as const;

// Names only server code uses. `SUPABASE_SECRET_KEY` as a string would mean the env schema leaked.
const MARKERS = [
  // A key, not supabase-js's own `startsWith("sb_secret_")` key-type check.
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /service_role/,
  /getAdminSupabase/,
  /SUPABASE_SECRET_KEY/,
  /CRON_SECRET/,
  /server\/admin\//,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("client bundles hold no server secrets or service-role code", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Build output is the same for both viewports.");
  const staticFiles = files(join(process.cwd(), ".next", "static")).filter((file) =>
    /\.(js|css|json|map|txt)$/.test(file),
  );
  expect(staticFiles.length).toBeGreaterThan(20);

  const secrets: [string, string][] = [];
  for (const name of SECRET_VARS) {
    const value = process.env[name];
    if (value && value.length >= 8) secrets.push([name, value]);
  }
  const leaks: string[] = [];
  for (const file of staticFiles) {
    const text = readFileSync(file, "utf8");
    const short = file.slice(file.indexOf(".next"));
    for (const [name, value] of secrets) if (text.includes(value)) leaks.push(`${short}: value of ${name}`);
    for (const marker of MARKERS) if (marker.test(text)) leaks.push(`${short}: ${marker.source}`);
  }
  expect(leaks).toEqual([]);
  testInfo.annotations.push({
    type: "scanned",
    description: `${staticFiles.length} files, ${secrets.length} secret values`,
  });
});

test("the dev-only test mailbox doesn't exist in production", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One check is enough.");
  const response = await request.get("/api/test/mailbox?email=e2e-anyone@example.com");
  expect(response.status()).toBe(404);
});
