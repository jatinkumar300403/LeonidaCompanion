import { randomBytes } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { adminClient, createAccount, signInWithMagicLink, supabaseReady } from "./helpers/auth";

/**
 * Phase 5 clips E2E. SPEC §15 #4: submit a YouTube clip (platform API mocked) → pending → admin
 * approves → shows in /clips → the facade loads the iframe on click. Under `next dev`, lookups by
 * e2e-… users are answered from recorded fixtures (D-073), so no platform is called. Clip ids
 * start with "e2e" and titles with "[E2E]"; the global teardown removes them.
 */
test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** No real platform traffic from the browser either: thumbnails and the player are stubbed. */
async function stubPlatforms(target: Page | BrowserContext) {
  await target.route("**/_next/image**", (route) => route.fulfill({ contentType: "image/png", body: PIXEL }));
  await target.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>player stub</title><p>player</p>" }),
  );
}

test("a member submits a YouTube clip, an admin approves it, and visitors play it", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const contextOptions = { ...testInfo.project.use, baseURL: testInfo.project.use.baseURL ?? "http://localhost:3000" };
  const [member, staff] = await Promise.all([createAccount("clipper"), createAccount("clipmod", "admin")]);
  const videoId = `e2e${randomBytes(4).toString("hex")}`;
  const title = `[E2E] Mocked YouTube clip ${videoId}`;
  await stubPlatforms(page);

  // 1. The member pastes a Shorts link, sees the preview, picks a category and sends it.
  await signInWithMagicLink(page, member.email, "/clips/submit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Submit a clip");
  const main = page.getByRole("main");
  await main.getByLabel("Clip link").fill(`https://youtube.com/shorts/${videoId}?feature=share`);
  await expect(main.getByText(title)).toBeVisible({ timeout: 30_000 });
  await expect(main.getByText("0:24").first()).toBeVisible();
  await main.getByRole("radio", { name: "Funny", exact: true }).click();
  await main.getByLabel("This isn't a story spoiler or cutscene").check();
  await main.getByRole("button", { name: "Send for review" }).click();
  await expect(main.getByRole("heading", { name: "Sent for review" })).toBeVisible({ timeout: 30_000 });

  // Phase 10 abuse case: the same clip again (another URL shape) is caught before it's sent.
  await page.goto("/clips/submit");
  await main.getByLabel("Clip link").fill(`https://www.youtube.com/watch?v=${videoId}`);
  await expect(main.getByText("Someone already sent this clip. It's waiting for a moderator.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(main.getByRole("button", { name: "Send for review" })).toBeDisabled();

  const admin = adminClient();
  const { data: row } = await admin
    .from("clips")
    .select("id, status, submitted_by, source, category, url")
    .eq("platform", "youtube")
    .eq("external_id", videoId)
    .single();
  expect(row).toMatchObject({
    status: "pending",
    submitted_by: member.id,
    source: "user",
    category: "funny",
    url: `https://www.youtube.com/shorts/${videoId}`,
  });

  // Pending clips aren't public.
  const visitorContext = await browser.newContext(contextOptions);
  await stubPlatforms(visitorContext);
  const visitor = await visitorContext.newPage();
  const pendingResponse = await visitor.goto(`/clips/${row!.id}`);
  expect(pendingResponse?.status()).toBe(404);

  // 2. An admin approves it from the queue.
  const staffContext = await browser.newContext(contextOptions);
  await stubPlatforms(staffContext);
  const staffPage = await staffContext.newPage();
  await signInWithMagicLink(staffPage, staff.email, "/admin/clips");
  await expect(staffPage.getByRole("heading", { level: 1 })).toHaveText("Clips");
  const item = staffPage.getByRole("listitem", { name: title });
  await expect(item).toBeVisible({ timeout: 30_000 });
  await expect(item.getByText(`sent by @${member.username}`)).toBeVisible();
  await item.getByRole("button", { name: "Approve" }).click();
  await expect(item).toHaveCount(0, { timeout: 30_000 });
  await staffContext.close();

  const { data: approved } = await admin.from("clips").select("status, approved_at").eq("id", row!.id).single();
  expect(approved?.status).toBe("approved");
  expect(approved?.approved_at).not.toBeNull();

  // 3. A visitor finds it in /clips (newest first) and plays it: consent, then the nocookie iframe.
  await visitor.goto("/clips?sort=new");
  const card = visitor.getByRole("listitem").filter({ has: visitor.getByRole("link", { name: title }) });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
    "href",
    `https://www.youtube.com/shorts/${videoId}`,
  );
  await expect(card.locator("iframe")).toHaveCount(0);
  await card.getByRole("button", { name: `Play clip: ${title} (loads YouTube)` }).click();
  await card.getByRole("dialog", { name: "Load YouTube video" }).getByRole("button", { name: "Load video" }).click();
  const frame = card.locator("iframe");
  await expect(frame).toHaveAttribute(
    "src",
    `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`,
  );

  // 4. Its own page: title, creator credit, VideoObject JSON-LD; the consent is remembered.
  await visitor.goto(`/clips/${row!.id}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(visitor.getByRole("link", { name: "Watch on YouTube" })).toBeVisible();
  const jsonLd = await visitor.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"VideoObject"') && text.includes(`/embed/${videoId}`))).toBe(true);
  await visitor.getByRole("button", { name: `Play clip: ${title} (loads YouTube)` }).click();
  await expect(visitor.locator("main iframe")).toHaveAttribute("src", new RegExp(`/embed/${videoId}\\?`));
  await visitorContext.close();

  // The submitter was notified with the clip's title.
  const { data: notes } = await admin
    .from("notifications")
    .select("payload")
    .eq("user_id", member.id)
    .eq("type", "clip_approved");
  expect(notes?.map((note) => note.payload)).toContainEqual(expect.objectContaining({ clip_title: title }));
});

test("visitors browse clips but sign in to submit; staff pages stay closed", async ({ page }) => {
  await page.goto("/clips");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("GTA 6 clips");
  await expect(page.getByRole("navigation", { name: "Sort clips" }).getByRole("link", { name: "Hot" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goto("/clips?category=glitch&sort=top");
  await expect(
    page.getByRole("navigation", { name: "Clip categories" }).getByRole("link", { name: "Glitch (funny)" }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/clips/submit");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fclips%2Fsubmit$/);

  await page.goto("/admin/clips");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin/);

  const response = await page.goto("/clips/top/2026-w99");
  expect(response?.status()).toBe(404);
  await page.goto("/clips/top/2026-w46");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Top 10 clips · Week 46, 2026");
});
