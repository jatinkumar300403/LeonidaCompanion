import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { CLIP_PAGE_SIZE, CLIP_WEEKLY_SIZE } from "@/config/clips";
import type { ClipCategory } from "@/config/tags";
import { topWeekStart, type ClipSort } from "@/lib/clips/feed";
import { parseWeekKey } from "@/lib/clips/week";
import { pageOffset } from "@/lib/forum/sort";
import { CLIPS_TAG, CLIPS_WEEKLY_TAG, clipTag } from "@/server/clips/cache-tags";
import { CLIP_COLUMNS, toClipDetail, toClipSummary, type ClipRow } from "@/server/clips/model";
import { getPublicSupabase } from "@/server/supabase/public";
import type { ClipDetail, ClipSummary } from "@/types/content";
import type { Database } from "@/types/database";

/**
 * Public clip reads (SPEC §6). They run as `anon` through the cookie-less client, so RLS shows
 * only approved clips, and are cached under the "clips" / "clip:<id>" / "clips-weekly" tags
 * (D-073). Errors log and return empty, so pages show their empty state instead of a 500.
 */
type Client = SupabaseClient<Database>;

function logError(what: string, error: { code?: string; message: string }) {
  console.error(`[clips] ${what} failed:`, error.code, error.message);
}

async function usernames(client: Client, ids: Iterable<string | null>): Promise<Map<string, string>> {
  const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const { data, error } = await client.from("public_profiles").select("id, username").in("id", unique);
  if (error) {
    logError("submitter names", error);
    return new Map();
  }
  return new Map(data.flatMap((row) => (row.id && row.username ? [[row.id, row.username] as const] : [])));
}

// ─── Feed ───────────────────────────────────────────────────────────────────
export type ClipListQuery = { category: ClipCategory | null; sort: ClipSort; page: number };
export type ClipListPage = { items: ClipSummary[]; hasMore: boolean };

async function fetchClipPage(category: ClipCategory | null, sort: ClipSort, page: number): Promise<ClipListPage> {
  const supabase = getPublicSupabase();
  if (!supabase) return { items: [], hasMore: false };
  const size = CLIP_PAGE_SIZE;
  const offset = pageOffset(page, size);

  let rows: ClipRow[] | null;
  if (sort === "hot") {
    const { data, error } = await supabase.rpc("hot_clips", {
      p_category: category ?? undefined,
      p_limit: size + 1,
      p_offset: offset,
    });
    if (error) logError("hot clips", error);
    rows = data;
  } else {
    let query = supabase.from("clips").select(CLIP_COLUMNS).eq("status", "approved");
    if (category) query = query.eq("category", category);
    query =
      sort === "new"
        ? query.order("approved_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
        : query
            .gte("approved_at", topWeekStart())
            .order("score", { ascending: false })
            .order("views_on_platform", { ascending: false, nullsFirst: false })
            .order("id", { ascending: false });
    const { data, error } = await query.range(offset, offset + size);
    if (error) logError(`${sort} clips`, error);
    rows = data;
  }
  const list = rows ?? [];
  return { items: list.slice(0, size).map(toClipSummary), hasMore: list.length > size };
}

export function listClips({ category, sort, page }: ClipListQuery): Promise<ClipListPage> {
  return unstable_cache(fetchClipPage, ["clips:list"], { tags: [CLIPS_TAG], revalidate: 60 })(category, sort, page);
}

// ─── One clip ───────────────────────────────────────────────────────────────
async function fetchClip(id: number): Promise<ClipDetail | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (error) logError("clip", error);
  if (!data) return null;
  const names = await usernames(supabase, [data.submitted_by]);
  return toClipDetail(data, data.submitted_by ? (names.get(data.submitted_by) ?? null) : null);
}

export function getClip(id: number): Promise<ClipDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return Promise.resolve(null);
  return unstable_cache(fetchClip, ["clips:one"], { tags: [clipTag(id)], revalidate: 300 })(id);
}

// ─── Clip of the day (D-022) ────────────────────────────────────────────────
/** Highest-scoring clip approved in the last 24 h (ties: platform views), else the latest approved one. */
async function fetchClipOfTheDay(): Promise<ClipSummary | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("status", "approved")
    .gte("approved_at", since)
    .order("score", { ascending: false })
    .order("views_on_platform", { ascending: false, nullsFirst: false })
    .order("approved_at", { ascending: false })
    .limit(1);
  if (recent.error) logError("clip of the day", recent.error);
  if (recent.data?.[0]) return toClipSummary(recent.data[0]);

  const latest = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (latest.error) logError("latest clip", latest.error);
  return latest.data?.[0] ? toClipSummary(latest.data[0]) : null;
}

export const getClipOfTheDay = unstable_cache(fetchClipOfTheDay, ["clips:of-the-day"], {
  tags: [CLIPS_TAG],
  revalidate: 60,
});

// ─── Weekly top 10 ──────────────────────────────────────────────────────────
export type WeeklyTop = { week: string; clips: ClipSummary[]; frozenAt: string };

async function fetchWeeklyTop(week: string): Promise<WeeklyTop | null> {
  const supabase = getPublicSupabase();
  if (!supabase || !parseWeekKey(week)) return null;
  const snapshot = await supabase
    .from("clip_weekly")
    .select("week, clip_ids, created_at")
    .eq("week", week)
    .maybeSingle();
  if (snapshot.error) logError("weekly snapshot", snapshot.error);
  if (!snapshot.data) return null;

  const ids = snapshot.data.clip_ids.slice(0, CLIP_WEEKLY_SIZE);
  let clips: ClipSummary[] = [];
  if (ids.length > 0) {
    // RLS leaves out clips removed since the snapshot was frozen.
    const { data, error } = await supabase.from("clips").select(CLIP_COLUMNS).in("id", ids).eq("status", "approved");
    if (error) logError("weekly clips", error);
    const byId = new Map((data ?? []).map((row) => [row.id, toClipSummary(row)]));
    clips = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }
  return { week: snapshot.data.week, clips, frozenAt: snapshot.data.created_at };
}

export function getWeeklyTop(week: string): Promise<WeeklyTop | null> {
  return unstable_cache(fetchWeeklyTop, ["clips:weekly"], { tags: [CLIPS_WEEKLY_TAG], revalidate: 3600 })(week);
}

async function fetchLatestWeekKey(): Promise<string | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("clip_weekly")
    .select("week")
    .order("week", { ascending: false })
    .limit(1);
  if (error) logError("latest week", error);
  return data?.[0]?.week ?? null;
}

export const getLatestWeekKey = unstable_cache(fetchLatestWeekKey, ["clips:latest-week"], {
  tags: [CLIPS_WEEKLY_TAG],
  revalidate: 3600,
});
