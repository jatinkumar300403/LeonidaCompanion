import "server-only";

/**
 * Dev outbox (D-054): in `next dev` without Resend, emails aren't sent. The link inside is logged
 * to the server console and kept here, so the D-044 test mailbox (GET /api/test/mailbox) can hand
 * it to Playwright for `e2e-…@example.com` addresses. Production builds never use this.
 */
type Outbox = Map<string, { link: string; at: number }>;
const store = globalThis as typeof globalThis & { __devOutbox?: Outbox };
const outbox: Outbox = (store.__devOutbox ??= new Map());

export const devOutboxEnabled = process.env.NODE_ENV === "development";

export function fileDevEmail(kind: string, email: string, link: string): void {
  if (!devOutboxEnabled) return;
  outbox.set(`${kind}:${email.toLowerCase()}`, { link, at: Date.now() });
  console.info(`[dev-outbox] ${kind} email for ${email}: ${link}`);
}

/** The newest link of `kind` for an address (read once, then removed). */
export function takeDevEmail(kind: string, email: string): string | null {
  if (!devOutboxEnabled) return null;
  const key = `${kind}:${email.toLowerCase()}`;
  const entry = outbox.get(key);
  outbox.delete(key);
  return entry?.link ?? null;
}
