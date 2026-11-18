import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, createAccount, signInWithMagicLink, supabaseReady } from "./helpers/auth";

/**
 * Phase 4 forum E2E. SPEC §15 #2 without the AI part (Phase 8 adds the suggested answer). Threads
 * are titled "E2E …" and their authors are e2e-… users; the global teardown removes both.
 */
test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

/** SPEC §15 E2E #2: create a thread in Help & Questions → another user replies → author accepts → Solved. */
test("a question gets a reply, the asker accepts it and the thread shows Solved", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const [asker, helper] = await Promise.all([createAccount("asker"), createAccount("helper")]);
  const title = `E2E thread ${randomBytes(3).toString("hex")}: where is the camera speed setting?`;

  // 1. The asker starts a thread in Help & Questions.
  await signInWithMagicLink(page, asker.email, "/forum/new?category=help");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start a thread");
  await expect(page.getByRole("radio", { name: /Help & Questions/ })).toHaveAttribute("aria-checked", "true");
  const main = page.getByRole("main");
  await main.getByLabel("Title").fill(title);
  await main.getByLabel("Details").fill("I looked through the settings menu but couldn't find the camera speed option.");
  await main.getByRole("button", { name: "Settings", exact: true }).click();
  await main.getByRole("button", { name: "Post thread" }).click();

  await expect(page).toHaveURL(/\/forum\/t\/\d+\/e2e-thread-/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByRole("heading", { name: "No replies yet" })).toBeVisible();
  const threadPath = new URL(page.url()).pathname;

  // 2. Another member replies, in their own browser.
  const helperContext = await browser.newContext({
    ...testInfo.project.use,
    baseURL: testInfo.project.use.baseURL ?? "http://localhost:3000",
  });
  const helperPage = await helperContext.newPage();
  await signInWithMagicLink(helperPage, helper.email, threadPath);
  await expect(helperPage.getByRole("heading", { level: 1 })).toHaveText(title);
  await helperPage.getByRole("textbox", { name: "Your reply" }).fill("Settings → Controls → Camera: raise the look sensitivity.");
  await helperPage.getByRole("button", { name: "Post reply" }).click();
  const helperReply = helperPage.getByRole("article", { name: `Reply by @${helper.username}` });
  await expect(helperReply).toContainText("raise the look sensitivity", { timeout: 30_000 });
  // The helper can't accept someone else's question.
  await expect(helperReply.getByRole("button", { name: "Accept answer" })).toHaveCount(0);
  await helperContext.close();

  // 3. The asker sees the reply (and a notification), accepts it, and the thread is solved.
  await page.reload();
  const reply = page.getByRole("article", { name: `Reply by @${helper.username}` });
  await expect(reply).toContainText("raise the look sensitivity");
  await expect(page.getByTestId("notification-bell")).toHaveAccessibleName(/1 unread/);
  await reply.getByRole("button", { name: "Accept answer" }).click();
  await expect(page.getByRole("heading", { name: "Accepted answer" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("main").getByText("Solved", { exact: true })).toBeVisible();

  // 4. The category list shows it as solved.
  await page.goto("/forum/help?sort=new");
  const row = page.getByRole("article").filter({ hasText: title });
  await expect(row.getByText("Solved", { exact: true })).toBeVisible();
});

test("visitors read threads but sign in to reply; old slugs redirect; Online is read-only", async ({ page }) => {
  const author = await createAccount("reader");
  const admin = adminClient();
  const { data: category } = await admin.from("forum_categories").select("id").eq("slug", "general").single();
  const slug = `e2e-visitor-${randomBytes(3).toString("hex")}`;
  const { data: thread, error } = await admin
    .from("threads")
    .insert({
      category_id: category!.id,
      author_id: author.id,
      title: `E2E visitor thread ${slug}`,
      slug,
      body_md: "Which radio station do you keep on while driving? ||The secret one is best.||",
    })
    .select("id")
    .single();
  expect(error).toBeNull();

  await page.goto(`/forum/t/${thread!.id}/an-old-slug`);
  await expect(page).toHaveURL(new RegExp(`/forum/t/${thread!.id}/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`E2E visitor thread ${slug}`);
  await expect(page.getByRole("link", { name: "Sign in to reply" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spoiler, hidden. Activate to reveal." })).toBeVisible();

  await page.goto("/forum/online");
  await expect(page.getByText("Read-only for now")).toBeVisible();
  await expect(page.getByRole("link", { name: "New thread" })).toHaveCount(0);
});
