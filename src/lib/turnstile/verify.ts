/**
 * Cloudflare Turnstile server check (bot protection on public writes). Pure: the secret and fetch
 * are passed in, so it's unit-tested without the network. `src/server/auth/turnstile.ts` wires it
 * to the environment.
 */
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** The hidden form field the Turnstile widget adds. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

export type TurnstileResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export async function verifyTurnstileToken({
  secret,
  token,
  ip,
  fetchImpl = fetch,
}: {
  secret: string | undefined;
  token: unknown;
  ip?: string;
  fetchImpl?: typeof fetch;
}): Promise<TurnstileResult> {
  // Not configured: only possible outside production (D-023), where the check is skipped.
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, error: "Please complete the bot check." };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await response.json()) as { success?: boolean };
    return data.success === true ? { ok: true } : { ok: false, error: "The bot check failed. Please try again." };
  } catch {
    return { ok: false, error: "We couldn't run the bot check. Please try again." };
  }
}
