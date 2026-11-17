import "server-only";
import { env } from "@/env";
import { TURNSTILE_FIELD, verifyTurnstileToken, type TurnstileResult } from "@/lib/turnstile/verify";

/** Verifies the Turnstile token a form posted. Skipped while Turnstile isn't configured (dev only). */
export function verifyTurnstileForm(formData: FormData, ip: string): Promise<TurnstileResult> {
  return verifyTurnstileToken({ secret: env.TURNSTILE_SECRET_KEY, token: formData.get(TURNSTILE_FIELD), ip });
}
