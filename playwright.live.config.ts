import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Post-deploy smoke test against the live site (Phase 11, docs/DEPLOY.md §7). No web server, and
 * it never reads .env.local (that's DEV). Settings come from the git-ignored `.env.prod.local`,
 * which the owner fills in themselves:
 *   LIVE_BASE_URL               https://<project>.vercel.app
 *   LIVE_SUPABASE_URL           the PROD project URL (only for the thread round-trip)
 *   LIVE_SUPABASE_SECRET_KEY    the PROD secret key (same; delete the file afterwards)
 * Run: pnpm e2e:live
 */
if (existsSync(".env.prod.local")) process.loadEnvFile(".env.prod.local");

const baseURL = process.env.LIVE_BASE_URL?.replace(/\/+$/, "");
if (!baseURL?.startsWith("https://")) {
  throw new Error("Set LIVE_BASE_URL (https://…) in .env.prod.local or the shell before pnpm e2e:live.");
}

export default defineConfig({
  testDir: "./e2e-live",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  timeout: 60_000,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
