import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, createAccount, signInWithMagicLink, supabaseReady } from "./helpers/auth";

/** Phase 3 content E2E (SPEC §15 #6 and #7). Test articles are titled "[E2E] …"; teardown deletes them. */
test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

/** SPEC §15 E2E #6: admin Quick Tip publish from a phone viewport → visible on /tips. */
test("an admin publishes a quick tip from a phone and it shows on /tips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The Quick Tip flow is the phone flow.");
  test.setTimeout(120_000);
  const admin = await createAccount("cms", "admin");
  const title = `[E2E] Quick tip ${randomBytes(3).toString("hex")}`;

  await signInWithMagicLink(page, admin.email, "/admin/articles/new?type=tip&mode=quick");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quick tip");

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("The tip").fill("Save before every big job. It costs nothing and saves a long retry.");
  await expect(page.getByText("2 sentences: good length.")).toBeVisible();
  await page.getByRole("button", { name: "Beginner", exact: true }).click();
  await expect(page.getByRole("button", { name: "Beginner", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  await expect(page.getByTestId("quick-tip-done")).toContainText("Tip published.");

  // Visible on the public index within the revalidation cycle (the publish action invalidates it).
  await page.goto("/tips");
  const card = page.getByRole("link", { name: title });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("Save before every big job.")).toBeVisible();
});

/** SPEC §15 E2E #7: a spoiler is hidden by default and revealed on click or Enter. */
test("spoilers in an article stay hidden until revealed by click or Enter", async ({ page }) => {
  const id = randomBytes(4).toString("hex");
  const slug = `e2e-spoilers-${id}`;
  const { error } = await adminClient()
    .from("articles")
    .insert({
      type: "tip",
      slug,
      title: `[E2E] Spoiler test ${id}`,
      summary: "A test article with spoilers.",
      body_md: "Intro paragraph.\n\n||The block spoiler text.||\n\nInline: before ||the inline secret|| after.",
      status: "published",
      published_at: new Date(Date.now() - 60_000).toISOString(),
      pipeline_ran_at: new Date().toISOString(),
    });
  expect(error).toBeNull();

  await page.goto(`/tips/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`[E2E] Spoiler test ${id}`);

  // Block spoiler: hidden (aria-hidden, blurred) until "Show spoiler" is clicked.
  const block = page.locator("div[data-spoiler-state]").filter({ hasText: "The block spoiler text." });
  await expect(block).toHaveAttribute("data-spoiler-state", "hidden");
  await expect(page.getByText("The block spoiler text.")).toHaveAttribute("aria-hidden", "true");
  await block.getByRole("button", { name: "Show spoiler" }).click();
  await expect(block).toHaveAttribute("data-spoiler-state", "revealed");
  await expect(page.getByText("The block spoiler text.")).not.toHaveAttribute("aria-hidden", "true");

  // Inline spoiler: keyboard only (focus + Enter).
  const inline = page.getByRole("button", { name: "Spoiler, hidden. Activate to reveal." });
  await expect(inline).toHaveCount(1);
  await inline.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('span[data-spoiler-state="revealed"]')).toHaveText("the inline secret");
  await expect(page.locator('span[data-spoiler-state="revealed"]')).toBeFocused();
});

/** SPEC §9 double opt-in on DEV without Resend: the link goes to the dev outbox (D-054). */
test("the Online waitlist uses double opt-in", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "Same flow on every viewport; checked once on desktop.");
  const email = `e2e-news-${randomBytes(4).toString("hex")}@example.com`;

  await page.goto("/online");
  const main = page.getByRole("main");
  await main.getByLabel("Email address").fill(email);
  await main.getByRole("button", { name: "Join waitlist" }).click();
  await expect(main.getByTestId("newsletter-sent")).toContainText("Check your inbox");

  const pending = await adminClient()
    .from("newsletter_subscribers")
    .select("status, pending_lists")
    .eq("email", email)
    .single();
  expect(pending.data).toEqual({ status: "pending", pending_lists: ["online_waitlist"] });

  let link: string | null = null;
  await expect
    .poll(async () => {
      const response = await request.get(`/api/test/mailbox?kind=newsletter&email=${encodeURIComponent(email)}`);
      if (response.ok()) link = ((await response.json()) as { link: string }).link;
      return link;
    })
    .not.toBeNull();

  await page.goto(link!);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("You're in: the Online waitlist.")).toBeVisible();

  const active = await adminClient()
    .from("newsletter_subscribers")
    .select("status, lists, confirm_token")
    .eq("email", email)
    .single();
  expect(active.data).toEqual({ status: "active", lists: ["online_waitlist"], confirm_token: null });

  // The link works once.
  await page.goto(link!);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("isn't valid any more");
});
