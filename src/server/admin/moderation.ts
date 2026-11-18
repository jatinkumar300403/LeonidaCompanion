import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * Moderation writes that need the service role (D-081). The AI's audit rows (`actor_type 'ai'`)
 * and admin alerts can't be written as a member: RLS only lets mods log their own human actions,
 * and notifications are insert-only for the server. Callers have already authorised the request
 * (the pre-check runs inside a member's own Server Action).
 */

export type AiLogEntry = {
  action: "ai_hold" | "ai_reject" | "shadow_hold";
  targetType: "thread" | "post" | "clip" | "profile";
  /** The row's id, or "none" when nothing was saved (a rejection, a held bio). */
  targetId: string | number;
  labels: readonly string[];
  reason: string;
  subjectId: string;
  excerpt: string | null;
};

export async function logAiAction(entry: AiLogEntry): Promise<void> {
  const { error } = await getAdminSupabase()
    .from("moderation_actions")
    .insert({
      actor_id: null,
      actor_type: "ai",
      action: entry.action,
      target_type: entry.targetType,
      target_id: String(entry.targetId),
      labels: [...entry.labels],
      reason: entry.reason || null,
      subject_id: entry.subjectId,
      excerpt: entry.excerpt,
    });
  if (error) console.error(`[moderation] logging ${entry.action} failed:`, error.code, error.message);
}

/** SPEC §8.2: a self_harm hold notifies every admin (bell, linked to the Held tab). */
export async function notifyAdmins(message: string): Promise<void> {
  const supabase = getAdminSupabase();
  const { data: admins, error } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (error) {
    console.error("[moderation] admin lookup failed:", error.code, error.message);
    return;
  }
  if (!admins || admins.length === 0) return;
  const insert = await supabase
    .from("notifications")
    .insert(admins.map((admin) => ({ user_id: admin.id, type: "mod_alert", payload: { message } })));
  if (insert.error) console.error("[moderation] admin alert failed:", insert.error.code, insert.error.message);
}

/**
 * After an edit the AI wants a moderator to see, the item goes back to `held`. Members can't set
 * that status themselves (the forum guards, D-039), so this runs with the service role.
 */
export async function holdContent(kind: "thread" | "post", id: number): Promise<boolean> {
  const supabase = getAdminSupabase();
  const { error } =
    kind === "thread"
      ? await supabase.from("threads").update({ status: "held" }).eq("id", id).in("status", ["open", "solved"])
      : await supabase.from("posts").update({ status: "held" }).eq("id", id).eq("status", "visible");
  if (error) console.error(`[moderation] holding ${kind} ${id} failed:`, error.code, error.message);
  return !error;
}
