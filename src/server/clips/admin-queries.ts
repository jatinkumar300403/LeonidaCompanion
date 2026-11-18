import "server-only";
import { CLIP_QUEUE_PAGE_SIZE } from "@/config/clips";
import { CLIP_COLUMNS, toClipQueueItem } from "@/server/clips/model";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { ClipQueueItem, ClipSource, ClipStatus } from "@/types/content";

/**
 * /admin/clips reads (SPEC §10). They run as the signed-in mod, so RLS ("mods see every clip")
 * decides; nothing here uses the service role. Pending clips oldest first, so nothing waits long;
 * the other tabs newest first.
 */
export const QUEUE_STATUSES = ["pending", "approved", "rejected", "removed"] as const satisfies readonly ClipStatus[];
export const QUEUE_SOURCES = ["user", "twitch_auto"] as const satisfies readonly ClipSource[];

export type QueueFilter = { status: ClipStatus; source: ClipSource | null };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseQueueFilter(params: Record<string, string | string[] | undefined>): QueueFilter {
  const status = first(params.status);
  const source = first(params.source);
  return {
    status: (QUEUE_STATUSES as readonly string[]).includes(status ?? "") ? (status as ClipStatus) : "pending",
    source: (QUEUE_SOURCES as readonly string[]).includes(source ?? "") ? (source as ClipSource) : null,
  };
}

export async function listReviewQueue(filter: QueueFilter): Promise<{ items: ClipQueueItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("clips").select(CLIP_COLUMNS, { count: "exact" }).eq("status", filter.status);
  if (filter.source) query = query.eq("source", filter.source);
  query =
    filter.status === "pending"
      ? query.order("created_at", { ascending: true })
      : query.order("created_at", { ascending: false });
  const { data, error, count } = await query.limit(CLIP_QUEUE_PAGE_SIZE);
  if (error) {
    console.error("[clips] review queue failed:", error.code, error.message);
    return { items: [], total: 0 };
  }

  const ids = [...new Set(data.flatMap((row) => (row.submitted_by ? [row.submitted_by] : [])))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const profiles = await supabase.from("public_profiles").select("id, username").in("id", ids);
    for (const row of profiles.data ?? []) if (row.id && row.username) names.set(row.id, row.username);
  }
  return {
    items: data.map((row) => toClipQueueItem(row, row.submitted_by ? (names.get(row.submitted_by) ?? null) : null)),
    total: count ?? data.length,
  };
}
