import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * Dev-only magic-link "mailbox" for Playwright and visual QA (D-044). In `next dev`, sign-ins for
 * `e2e-…@example.com` addresses don't send email: the link is generated with the admin API and
 * kept here, and GET /api/test/mailbox hands it to the test. In production builds
 * NODE_ENV is "production", so none of this can run.
 */
export const TEST_EMAIL_PATTERN = /^e2e-[a-z0-9-]{1,60}@example\.com$/;

export function isTestIdentity(email: string): boolean {
  return process.env.NODE_ENV === "development" && TEST_EMAIL_PATTERN.test(email);
}

type Mailbox = Map<string, { link: string; at: number }>;
const store = globalThis as typeof globalThis & { __testMailbox?: Mailbox };
const mailbox: Mailbox = (store.__testMailbox ??= new Map());

/** Generates a sign-in link without sending email (the user is created if new) and files it. */
export async function deliverTestMagicLink(email: string, origin: string, next: string): Promise<void> {
  if (!isTestIdentity(email)) throw new Error("Not a test identity.");
  const { data, error } = await getAdminSupabase().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "generateLink returned no token.");

  const url = new URL("/auth/callback", origin);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "email");
  url.searchParams.set("next", next);
  mailbox.set(email, { link: url.toString(), at: Date.now() });
}

/** The newest link for a test address (read once, then removed). */
export function takeTestMagicLink(email: string): string | null {
  if (!isTestIdentity(email)) return null;
  const entry = mailbox.get(email);
  mailbox.delete(email);
  return entry ? entry.link : null;
}
