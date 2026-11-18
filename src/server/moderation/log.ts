import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * The audit log (SPEC §5: every mod action goes to `moderation_actions`). Mods insert their own
 * rows under RLS ("Mods log their own actions"), so this takes the mod's own client. A failed log
 * write is reported but never undoes the action. `subjectId` is whose content it was (a user's
 * moderation history, D-082); `excerpt` is a short plain-text copy of what was acted on.
 */
export async function logModerationAction(
  client: SupabaseClient<Database>,
  entry: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string | number;
    reason?: string | null;
    labels?: readonly string[];
    subjectId?: string | null;
    excerpt?: string | null;
  },
): Promise<void> {
  const { error } = await client.from("moderation_actions").insert({
    actor_id: entry.actorId,
    actor_type: "human",
    action: entry.action,
    target_type: entry.targetType,
    target_id: String(entry.targetId),
    reason: entry.reason ?? null,
    labels: entry.labels ? [...entry.labels] : [],
    subject_id: entry.subjectId ?? null,
    excerpt: entry.excerpt ? entry.excerpt.slice(0, 500) : null,
  });
  if (error) console.error(`[moderation] logging ${entry.action} failed:`, error.code, error.message);
}
