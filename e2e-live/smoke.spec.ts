import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "../src/config/site";

/**
 * Post-deploy smoke test (Prompt 11, docs/DEPLOY.md §7) against LIVE_BASE_URL. Read-only, except
 * the forum round-trip: it creates one `e2e-live-…@example.com` member on PROD, posts a thread and
 * deletes the member, the thread and its audit rows again in `finally`.
 */
const baseURL = process.env.LIVE_BASE_URL!.replace(/\/+$/, "");
const host = new URL(baseURL).host;

test("home renders with the disclaimer and WebSite JSON-LD", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("site-disclaimer")).toHaveText(siteConfig.disclaimer);
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("WebSite");
});

test("tips index loads, and a tip page opens when one is published", async ({ page }) => {
  expect((await page.goto("/tips"))?.status()).toBe(200);
  const tip = page.locator('main a[href^="/tips/"]').first();
  if ((await tip.count()) === 0) {
    test.info().annotations.push({ type: "skipped-step", description: "No published tip on PROD yet." });
    return;
  }
  await tip.click();
  await expect(page).toHaveURL(/\/tips\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("site-disclaimer")).toBeVisible();
});

test("clips index loads, and a clip page opens when one is approved", async ({ page }) => {
  expect((await page.goto("/clips"))?.status()).toBe(200);
  const clip = page.locator('main a[href^="/clips/"]');
  const ids = (await clip.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).filter((href) =>
    /^\/clips\/\d+$/.test(href ?? ""),
  );
  if (ids.length === 0) {
    test.info().annotations.push({ type: "skipped-step", description: "No approved clip on PROD yet." });
    return;
  }
  expect((await page.goto(ids[0]!))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("/ask and the forum index load", async ({ page }) => {
  for (const path of ["/ask", "/forum"]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.getByTestId("site-disclaimer")).toBeVisible();
  }
});

test("sitemap.xml, robots.txt and the manifest are served for the live host", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("<sitemapindex");
  expect(sitemapXml).toContain(`https://${host}/sitemaps/`);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsTxt = await robots.text();
  expect(robotsTxt).toContain(`Sitemap: https://${host}/sitemap.xml`);
  expect(robotsTxt).toContain("Allow: /api/indexnow");
  expect(robotsTxt).not.toMatch(/^Disallow: \/$/m);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).name).toBe(siteConfig.name);
});

test("cron routes refuse requests without the bearer secret", async ({ request }) => {
  for (const route of ["publish-scheduled", "twitch-clips", "weekly-clips"]) {
    expect((await request.get(`/api/cron/${route}`)).status(), route).toBe(401);
  }
});

test("a new member can start a thread (then everything is deleted)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Runs once, on desktop.");
  const url = process.env.LIVE_SUPABASE_URL;
  const secret = process.env.LIVE_SUPABASE_SECRET_KEY;
  test.skip(!url || !secret, "LIVE_SUPABASE_URL / LIVE_SUPABASE_SECRET_KEY are not in .env.prod.local.");
  test.setTimeout(120_000);

  const admin = createClient(url!, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
  const id = randomBytes(4).toString("hex");
  const email = `e2e-live-${id}@example.com`;
  const title = `E2E live smoke ${id}: where is the camera speed setting?`;
  let userId: string | undefined;

  try {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(`createUser failed: ${created.error?.message}`);
    userId = created.data.user.id;
    const now = new Date().toISOString();
    const profile = await admin
      .from("profiles")
      .insert({ id: userId, username: `e2e_${id}`, age_confirmed_at: now, terms_accepted_at: now });
    if (profile.error) throw new Error(`profile failed: ${profile.error.message}`);

    // Sign in the way a token_hash magic link does (docs/DEPLOY.md, PROD email template).
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) throw new Error(`generateLink failed: ${link.error.message}`);
    const next = encodeURIComponent("/forum/new?category=help");
    await page.goto(`/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=${next}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start a thread");

    const main = page.getByRole("main");
    await main.getByLabel("Title").fill(title);
    await main
      .getByLabel("Details")
      .fill("I looked through the settings menu but couldn't find the camera speed option.");
    await main.getByRole("button", { name: "Settings", exact: true }).click();
    await main.getByRole("button", { name: "Post thread" }).click();

    await expect(page).toHaveURL(/\/forum\/t\/\d+\/e2e-live-smoke-/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  } finally {
    if (userId) {
      const threads = await admin.from("threads").select("id").eq("author_id", userId);
      const threadIds = (threads.data ?? []).map((thread) => String(thread.id));
      await admin.from("moderation_actions").delete().eq("subject_id", userId);
      if (threadIds.length > 0) {
        await admin.from("moderation_actions").delete().eq("target_type", "thread").in("target_id", threadIds);
        await admin.from("posts").delete().in("thread_id", threadIds);
        await admin.from("threads").delete().in("id", threadIds);
      }
      await admin.auth.admin.deleteUser(userId);
      const left = await admin
        .from("threads")
        .select("id", { count: "exact", head: true })
        .like("title", "E2E live smoke %");
      expect(left.count ?? 0, "smoke threads left on PROD").toBe(0);
    }
  }
});
