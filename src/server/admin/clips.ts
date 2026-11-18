import "server-only";
import { CLIP_WEEKLY_SIZE } from "@/config/clips";
import type { ClipCategory } from "@/config/tags";
import { formatWeekKey, weekRange, type IsoWeek } from "@/lib/clips/week";
import { getAdminSupabase } from "@/server/admin/supabase";
import type { ResolvedClip } from "@/server/clips/types";
import type { ClipPlatform, ClipStatus } from "@/types/content";

/**
 * Clip writes that need the service role (D-070). Members can't insert clip rows through the API:
 * the submit action resolves the link with the platform first and calls insertUserClip with the
 * session's user id, and the Twitch cron inserts auto-candidates. Never call these with input that
 * hasn't been checked by resolveClip and the action's auth gate.
 */

export type ExistingClip = { id: number; status: ClipStatus };

export async function findClipByExternal(platform: ClipPlatform, externalId: string): Promise<ExistingClip | null> {
  const { data, error } = await getAdminSupabase()
    .from("clips")
    .select("id, status")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(`clip lookup failed: ${error.message}`);
  return data ? { id: data.id, status: data.status as ClipStatus } : null;
}

function clipColumns(clip: ResolvedClip) {
  return {
    platform: clip.platform,
    external_id: clip.externalId,
    url: clip.url,
    title: clip.title,
    creator_name: clip.creatorName,
    creator_url: clip.creatorUrl,
    duration_sec: clip.durationSec,
    thumbnail_url: clip.thumbnailUrl,
    views_on_platform: clip.viewsOnPlatform,
  };
}

export type InsertUserClipResult = { ok: true; id: number } | { ok: false; duplicate: ExistingClip };

/** A member's submission, always `pending` (SPEC §6: a mod approves it). */
export async function insertUserClip(
  clip: ResolvedClip,
  input: { userId: string; category: ClipCategory; caption: string | null },
): Promise<InsertUserClipResult> {
  const { data, error } = await getAdminSupabase()
    .from("clips")
    .insert({
      ...clipColumns(clip),
      category: input.category,
      caption: input.caption,
      source: "user",
      status: "pending",
      submitted_by: input.userId,
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const existing = await findClipByExternal(clip.platform, clip.externalId);
    if (existing) return { ok: false, duplicate: existing };
  }
  if (error || !data) throw new Error(`clip insert failed: ${error?.message ?? "no row"}`);
  return { ok: true, id: data.id };
}

/** Hourly Twitch auto-candidates: pending, `twitch_auto`, skipping clips we already have. */
export async function insertAutoClips(clips: readonly ResolvedClip[]): Promise<number> {
  if (clips.length === 0) return 0;
  const { data, error } = await getAdminSupabase()
    .from("clips")
    .upsert(
      clips.map((clip) => ({ ...clipColumns(clip), category: "other", source: "twitch_auto", status: "pending" })),
      { onConflict: "platform,external_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`auto clip insert failed: ${error.message}`);
  return data?.length ?? 0;
}

/**
 * Freezes a week's top 10 (SPEC §6): clips approved during that ISO week, by score, ties broken by
 * platform views. A week that already has a snapshot is left as it is.
 */
export async function freezeWeeklyTop(week: IsoWeek): Promise<{ week: string; created: boolean; clipIds: number[] }> {
  const admin = getAdminSupabase();
  const key = formatWeekKey(week);
  const existing = await admin.from("clip_weekly").select("clip_ids").eq("week", key).maybeSingle();
  if (existing.error) throw new Error(`weekly lookup failed: ${existing.error.message}`);
  if (existing.data) return { week: key, created: false, clipIds: existing.data.clip_ids };

  const { start, end } = weekRange(week);
  const { data, error } = await admin
    .from("clips")
    .select("id")
    .eq("status", "approved")
    .gte("approved_at", start.toISOString())
    .lt("approved_at", end.toISOString())
    .order("score", { ascending: false })
    .order("views_on_platform", { ascending: false, nullsFirst: false })
    .order("approved_at", { ascending: true })
    .limit(CLIP_WEEKLY_SIZE);
  if (error) throw new Error(`weekly ranking failed: ${error.message}`);
  const clipIds = data.map((row) => row.id);

  const insert = await admin
    .from("clip_weekly")
    .upsert({ week: key, clip_ids: clipIds }, { onConflict: "week", ignoreDuplicates: true })
    .select("week");
  if (insert.error) throw new Error(`weekly snapshot failed: ${insert.error.message}`);
  return { week: key, created: (insert.data?.length ?? 0) > 0, clipIds };
}
