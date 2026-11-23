import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Production-build checks (Phase 9): the service worker, the CSP with real third-party scripts and
 * the JS budgets only exist in `next build` output, so these run against `pnpm start`.
 * Run `pnpm build` first, then `pnpm e2e:prod`. The server is never reused, so a dev server
 * already on the port makes this fail loudly instead of testing the wrong build.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.PROD_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e-prod",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
