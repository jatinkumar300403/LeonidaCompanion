import { randomBytes } from "node:crypto";
import { expect, test, type Browser, type BrowserContextOptions, type TestInfo } from "@playwright/test";
import { adminClient, createAccount, signInWithMagicLink, supabaseReady } from "./helpers/auth";

/**
 * Phase 6 moderation E2E. SPEC §15 #3 (report → mod queue → removed for the public) plus the held
 * flow: the AI pre-check is answered by the dev mock for e2e identities (D-080), so
 * "[e2e-hold:harassment]" in a reply holds it. Threads are titled "E2E …"; the global teardown
 * removes them, the e2e users and their audit rows.
 */
test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

// Serial, with one moderator signed in once per viewport: every magic-link sign-in counts against
// Supabase Auth's verify limit (30 per 5 minutes per IP), which a full run already comes close to.
test.describe.configure({ mode: "serial" });

let mod: { id: string; email: string; username: string };
let modState: BrowserContextOptions["storageState"];

test.beforeAll(async ({ browser }, testInfo) => {
  mod = await createAccount("mod", "mod");
  const { context, page } = await newPage(browser, testInfo);
  await signInWithMagicLink(page, mod.email, "/admin/moderation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moderation");
  modState = await context.storageState();
  await context.close();
});

async function seedThread(authorId: string, title: string) {
  const admin = adminClient();
  const { data: category } = await admin.from("forum_categories").select("id").eq("slug", "general").single();
  const slug = `e2e-mod-${randomBytes(3).toString("hex")}`;
  const { data, error } = await admin
    .from("threads")
    .insert({
      category_id: category!.id,
      author_id: authorId,
      title,
      slug,
      body_md: "Has anyone found the photo mode settings yet? Asking for a friend.",
    })
    .select("id, slug")
    .single();
  expect(error).toBeNull();
  return { id: data!.id as number, path: `/forum/t/${data!.id}/${data!.slug}` };
}

async function newPage(browser: Browser, testInfo: TestInfo, storageState?: BrowserContextOptions["storageState"]) {
  const context = await browser.newContext({
    ...testInfo.project.use,
    baseURL: testInfo.project.use.baseURL ?? "http://localhost:3000",
    storageState,
  });
  return { context, page: await context.newPage() };
}

/** SPEC §15 E2E #3: report a post → it appears in the mod queue → mod removes it → hidden for the public. */
test("a reported reply reaches the mod queue, gets removed and disappears for visitors", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const [author, replier, reporter] = await Promise.all([
    createAccount("asker"),
    createAccount("replier"),
    createAccount("reporter"),
  ]);
  const tag = randomBytes(3).toString("hex");
  const thread = await seedThread(author.id, `E2E report thread ${tag}: photo mode`);
  const replyText = `E2E reported reply ${tag}: cheap coins for everyone, message me now`;
  const admin = adminClient();
  const { data: post } = await admin
    .from("posts")
    .insert({ thread_id: thread.id, author_id: replier.id, body_md: replyText })
    .select("id")
    .single();

  // 1. A member reports the reply from its "…" menu.
  await signInWithMagicLink(page, reporter.email, thread.path);
  const reply = page.getByRole("article", { name: `Reply by @${replier.username}` });
  await expect(reply).toContainText(replyText);
  await reply.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Spam" }).click();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("A moderator will take a look")).toBeVisible();

  // 2. A moderator finds it under Reports.
  const modSide = await newPage(browser, testInfo, modState);
  await modSide.page.goto("/admin/moderation?tab=reports");
  await expect(modSide.page.getByRole("heading", { level: 1 })).toHaveText("Moderation");
  const card = modSide.page.getByRole("article").filter({ hasText: replyText });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText("Spam", { exact: true })).toBeVisible();

  // 3. They ban the author for a day, then remove the reply.
  await card.getByRole("button", { name: "Ban author" }).click();
  const banDialog = modSide.page.getByRole("dialog");
  await expect(banDialog.getByRole("heading", { name: `Ban @${replier.username}` })).toBeVisible();
  await banDialog.getByRole("radio", { name: "1 day" }).click();
  await banDialog.getByLabel("Reason (the member sees it)").fill("Selling coins in the help forum");
  await banDialog.getByRole("button", { name: "Ban" }).click();
  // The ban RPC plus its notification can take several seconds under 4 workers on next dev.
  await expect(modSide.page.getByText(`@${replier.username}: Banned.`)).toBeVisible({ timeout: 20_000 });

  await card.getByRole("button", { name: "Remove" }).click();
  await expect(modSide.page.getByText("Removed. Reports closed.")).toBeVisible({ timeout: 20_000 });
  await expect(card).toHaveCount(0);
  await modSide.context.close();

  // 4. A signed-out visitor no longer sees it.
  const visitor = await newPage(browser, testInfo);
  await visitor.page.goto(thread.path);
  await expect(visitor.page.getByRole("heading", { level: 1 })).toHaveText(`E2E report thread ${tag}: photo mode`);
  await expect(visitor.page.getByText(replyText)).toHaveCount(0);
  await expect(visitor.page.getByRole("heading", { name: "No replies yet" })).toBeVisible();
  await visitor.context.close();

  // 5. The database agrees: the report is actioned, the action is logged, the author is banned.
  const { data: reports } = await admin
    .from("reports")
    .select("status, resolved_by")
    .eq("target_type", "post")
    .eq("target_id", String(post!.id));
  expect(reports).toEqual([{ status: "actioned", resolved_by: mod.id }]);
  const { data: log } = await admin
    .from("moderation_actions")
    .select("action, actor_id, subject_id")
    .eq("target_type", "post")
    .eq("target_id", String(post!.id));
  expect(log).toEqual([{ action: "post_remove", actor_id: mod.id, subject_id: replier.id }]);
  const { data: profile } = await admin
    .from("profiles")
    .select("is_banned, banned_until")
    .eq("id", replier.id)
    .single();
  expect(profile!.is_banned).toBe(true);
  expect(new Date(profile!.banned_until!).getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000);
});

/** SPEC §8.2 hold: the author sees "Pending review", visitors see nothing until a mod approves. */
test("a held reply waits for a moderator, then goes public", async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000);
  const [author, member] = await Promise.all([createAccount("asker"), createAccount("member")]);
  const tag = randomBytes(3).toString("hex");
  const thread = await seedThread(author.id, `E2E held thread ${tag}: photo mode`);
  const replyText = `E2E held reply ${tag}: you clearly never played it [e2e-hold:harassment]`;

  // 1. The member replies; the pre-check holds it.
  await signInWithMagicLink(page, member.email, thread.path);
  await page.getByRole("textbox", { name: "Your reply" }).fill(replyText);
  await page.getByRole("button", { name: "Post reply" }).click();
  await expect(page.getByText("Your reply is waiting for a moderator")).toBeVisible({ timeout: 30_000 });
  const mine = page.getByRole("article", { name: `Reply by @${member.username}` });
  await expect(mine).toContainText(`E2E held reply ${tag}`);
  await expect(mine.getByText(/Pending review/)).toBeVisible();

  // 2. Visitors don't see it.
  const visitor = await newPage(browser, testInfo);
  await visitor.page.goto(thread.path);
  await expect(visitor.page.getByText(`E2E held reply ${tag}`)).toHaveCount(0);

  // 3. A moderator approves it from Held, with the AI's label on the card.
  const modSide = await newPage(browser, testInfo, modState);
  await modSide.page.goto("/admin/moderation");
  const card = modSide.page.getByRole("article", { name: `Held reply by @${member.username}` });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText("Harassment", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(modSide.page.getByText("Approved: it's public now.")).toBeVisible();
  await expect(card).toHaveCount(0);
  await modSide.context.close();

  // 4. Now everyone sees it.
  await visitor.page.reload();
  await expect(visitor.page.getByRole("article", { name: `Reply by @${member.username}` })).toContainText(
    `E2E held reply ${tag}`,
  );
  await visitor.context.close();
});
