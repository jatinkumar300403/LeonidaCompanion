import { expect, test } from "@playwright/test";

/**
 * Service worker (SPEC §13 PWA, D-009, D-095) against a production build: it registers at
 * /serwist/sw.js, controls the whole site (Service-Worker-Allowed: /), shows the offline page for
 * pages it doesn't have, and keeps pages already visited readable offline.
 */
test.skip(({ isMobile }) => isMobile, "One browser profile is enough for the worker; checked on desktop.");

test("the service worker is served with a root scope and never cached", async ({ request }) => {
  const response = await request.get("/serwist/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("javascript");
  expect(response.headers()["service-worker-allowed"]).toBe("/");
  expect(response.headers()["cache-control"]).toContain("no-cache");
  expect(await response.text()).toContain("/offline");
});

test("it controls the site, falls back to the offline page and keeps visited pages", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe("/");
  // The first load happens before the worker takes over; reload so it handles navigations.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // Visit a couple of public pages while online so they're cached.
  await page.goto("/tips");
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");

  await context.setOffline(true);
  try {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");

    await page.goto("/never-visited-page-for-the-offline-test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're offline");

    // Private pages are never cached: offline they get the offline page too.
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're offline");
  } finally {
    await context.setOffline(false);
  }
});
