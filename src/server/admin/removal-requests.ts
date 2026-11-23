import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * Stores a content-removal request as a `dmca` report (SPEC §14, D-098). Visitors without an
 * account can send one, and RLS only lets active members insert reports as themselves, so this
 * runs with the service role, after the Server Action has validated the input, checked Turnstile
 * and applied the rate limits. `reporter_id` is the signed-in member, if any.
 */
export async function insertRemovalRequest({
  reporterId,
  targetId,
  details,
}: {
  reporterId: string | null;
  targetId: string;
  details: string;
}): Promise<{ id: number } | null> {
  const { data, error } = await getAdminSupabase()
    .from("reports")
    .insert({ reporter_id: reporterId, target_type: "dmca", target_id: targetId, reason: "copyright", details })
    .select("id")
    .single();
  if (error) {
    console.error("[removal] insert failed:", error.code, error.message);
    return null;
  }
  return data;
}
