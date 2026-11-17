import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E auth helpers (D-044). Test identities are `e2e-…@example.com`: in `next dev` their magic
 * links go to the test mailbox (GET /api/test/mailbox) instead of email. The admin client sets up
 * staff profiles; `pnpm test:cleanup` (the global teardown) deletes every e2e user afterwards.
 */
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const supabaseReady = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.SUPABASE_SECRET_KEY,
);

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function testIdentity(label: string) {
  const id = randomBytes(4).toString("hex");
  return { email: `e2e-${label}-${id}@example.com`, username: `e2e_${id}` };
}

/** The sign-in link the dev server filed for `email` (waits briefly for it). */
export async function readMailbox(request: APIRequestContext, email: string): Promise<string> {
  let link: string | null = null;
  await expect
    .poll(
      async () => {
        const response = await request.get(`/api/test/mailbox?email=${encodeURIComponent(email)}`);
        if (response.ok()) link = ((await response.json()) as { link: string }).link;
        return link;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();
  return link!;
}

/** Requests a magic link through the real sign-in form and opens it from the test mailbox. */
export async function signInWithMagicLink(page: Page, email: string, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await page.getByRole("main").getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await page.goto(await readMailbox(page.request, email));
}

/** Creates a confirmed account with a finished profile (optionally staff) through the admin API. */
export async function createAccount(label: string, role: "user" | "mod" | "admin" = "user") {
  const identity = testIdentity(label);
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: identity.email, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const now = new Date().toISOString();
  const profile = await admin.from("profiles").insert({
    id: data.user.id,
    username: identity.username,
    age_confirmed_at: now,
    terms_accepted_at: now,
  });
  if (profile.error) throw new Error(`profile failed: ${profile.error.message}`);
  if (role !== "user") {
    const update = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (update.error) throw new Error(`role failed: ${update.error.message}`);
  }
  return { ...identity, id: data.user.id };
}
