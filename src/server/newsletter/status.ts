import "server-only";

/**
 * Whether newsletter/waitlist sign-ups accept submissions. Phase 3 builds the double opt-in
 * Server Action and turns this on when Supabase and Resend are configured; until then the
 * forms render disabled with an "opens soon" note.
 */
export function isNewsletterEnabled(): boolean {
  return false;
}
