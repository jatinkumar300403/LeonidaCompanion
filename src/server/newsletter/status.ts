import "server-only";
import { integrations } from "@/env";
import { canSendEmail } from "@/server/email/send";

/**
 * Whether newsletter/waitlist sign-ups accept submissions (SPEC §9): the subscriber table is
 * written with the service role, and the confirmation email needs Resend (or, in `next dev` only,
 * the dev outbox, D-054). Otherwise the forms render disabled with an "opens soon" note.
 */
export function isNewsletterEnabled(): boolean {
  return integrations.supabase && integrations.supabaseAdmin && canSendEmail();
}
