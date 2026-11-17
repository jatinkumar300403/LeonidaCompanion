import "server-only";
import { isConfirmTokenExpired, mergeLists, type NewsletterList } from "@/lib/newsletter/token";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * newsletter_subscribers is closed to the API (service role only, D-042), so these run with the
 * secret key, always after the caller validated the input and passed rate limits + Turnstile.
 */

export type PendingResult = "already_subscribed" | "needs_confirmation";

/** Records the wish to join `list` and stores the hash of a fresh confirmation token. */
export async function requestSubscription(
  email: string,
  list: NewsletterList,
  tokenHash: string,
): Promise<PendingResult> {
  const admin = getAdminSupabase();
  const { data: existing, error } = await admin
    .from("newsletter_subscribers")
    .select("id, status, lists, pending_lists")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(`newsletter lookup failed: ${error.message}`);

  if (existing?.status === "active" && existing.lists.includes(list)) return "already_subscribed";

  const now = new Date().toISOString();
  if (existing) {
    const { error: updateError } = await admin
      .from("newsletter_subscribers")
      .update({
        status: existing.status === "active" ? "active" : "pending",
        pending_lists: mergeLists([], [...existing.pending_lists, list]),
        confirm_token: tokenHash,
        confirm_sent_at: now,
      })
      .eq("id", existing.id);
    if (updateError) throw new Error(`newsletter update failed: ${updateError.message}`);
  } else {
    const { error: insertError } = await admin.from("newsletter_subscribers").insert({
      email,
      status: "pending",
      lists: [],
      pending_lists: [list],
      confirm_token: tokenHash,
      confirm_sent_at: now,
    });
    // A parallel sign-up for the same address won the race: treat it like the existing row.
    if (insertError?.code === "23505") return requestSubscription(email, list, tokenHash);
    if (insertError) throw new Error(`newsletter insert failed: ${insertError.message}`);
  }
  return "needs_confirmation";
}

export type ConfirmResult = { ok: true; lists: NewsletterList[] } | { ok: false; reason: "invalid" | "expired" };

export async function confirmSubscription(tokenHash: string): Promise<ConfirmResult> {
  const admin = getAdminSupabase();
  const { data: row, error } = await admin
    .from("newsletter_subscribers")
    .select("id, lists, pending_lists, confirm_sent_at")
    .eq("confirm_token", tokenHash)
    .maybeSingle();
  if (error) throw new Error(`newsletter confirm lookup failed: ${error.message}`);
  if (!row) return { ok: false, reason: "invalid" };
  if (isConfirmTokenExpired(row.confirm_sent_at)) return { ok: false, reason: "expired" };

  const lists = mergeLists(row.lists, row.pending_lists);
  const { error: updateError } = await admin
    .from("newsletter_subscribers")
    .update({ status: "active", lists, pending_lists: [], confirm_token: null, confirmed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (updateError) throw new Error(`newsletter confirm failed: ${updateError.message}`);
  return { ok: true, lists };
}
