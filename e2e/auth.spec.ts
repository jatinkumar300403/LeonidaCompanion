import { expect, test } from "@playwright/test";
import {
  adminClient,
  createAccount,
  readMailbox,
  signInWithMagicLink,
  supabaseReady,
  testIdentity,
} from "./helpers/auth";

test.skip(!supabaseReady, "Needs the Supabase DEV keys in .env.local.");

/** SPEC §15 E2E #1: sign up (magic link mocked) → choose username → age checkbox → lands on home. */
test("sign up with a magic link, choose a username and land on home", async ({ page, request }) => {
  const { email, username } = testIdentity("signup");

  await page.goto("/");
  await page.getByTestId("account-slot").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in or join");

  await page.getByRole("main").getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("magic-link-sent")).toContainText(email);

  // The "email": the dev server's test mailbox holds the link instead of sending it.
  await page.goto(await readMailbox(request, email));
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose your username");

  // Reserved names are refused live; a fresh one is available.
  const usernameField = page.getByLabel("Username");
  await usernameField.fill("admin");
  await expect(page.locator("#username-status")).toHaveText("That username is reserved.");
  await usernameField.fill(username);
  await expect(page.locator("#username-status")).toHaveText(`@${username} is available.`);

  // Without the 16+ and terms boxes, the form explains what's missing.
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page.getByText("You must be 16 or older to join.")).toBeVisible();

  await page
    .getByRole("radiogroup", { name: /Platform/ })
    .getByText("PS5", { exact: true })
    .click();
  await expect(page.getByRole("radio", { name: "PS5" })).toBeChecked();
  await page.getByRole("checkbox", { name: "I am 16 or older" }).check();
  await page.getByRole("checkbox", { name: /I accept the Terms and the Community Guidelines/ }).check();
  await page.getByRole("button", { name: "Finish sign-up" }).click();

  // Profile creation plus the first dev compile of / can be slow while the suite runs in parallel.
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your unofficial guide to GTA VI");
  await expect(page.getByRole("button", { name: `Account menu for @${username}` })).toBeVisible();

  // The profile is public, and signing in again skips onboarding.
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`@${username}`);
  await expect(page.getByText("Plays on PS5")).toBeVisible();
});

test("a signed-in user without a profile is sent to onboarding", async ({ page }) => {
  const { email } = testIdentity("incomplete");
  await signInWithMagicLink(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.goto("/forum");
  await expect(page).toHaveURL(/\/onboarding\?next=%2Fforum$/);
  // Legal pages stay reachable mid-onboarding.
  await page.goto("/terms");
  await expect(page).toHaveURL(/\/terms$/);
});

test("signed-out visitors are sent to sign in, and /admin is hidden from members", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings$/);

  const member = await createAccount("member");
  await signInWithMagicLink(page, member.email, "/settings");
  await expect(page).toHaveURL(/\/settings$/);
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
});

test("open redirects in ?next are ignored", async ({ page }) => {
  const member = await createAccount("redirect");
  await signInWithMagicLink(page, member.email, "https://evil.example/");
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
});

/** SPEC §9 / E2E #8 (account part): delete account from settings. */
test("delete account from settings", async ({ page }) => {
  const member = await createAccount("delete");
  await signInWithMagicLink(page, member.email, "/settings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");

  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete your account?" });
  const confirm = dialog.getByRole("button", { name: "Delete forever" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type ${member.username} to confirm`).fill(member.username);
  await dialog.getByRole("checkbox", { name: /Also replace the text/ }).check();
  await confirm.click();

  // Deleting runs several admin calls; give it room when the suite runs in parallel.
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByText("Your account has been deleted.")).toBeVisible();
  await expect(page.getByTestId("account-slot").getByRole("link", { name: "Sign in" })).toBeVisible();

  const { data } = await adminClient().auth.admin.getUserById(member.id);
  expect(data.user).toBeNull();
  const profile = await page.goto(`/u/${member.username}`);
  expect(profile?.status()).toBe(404);
});
