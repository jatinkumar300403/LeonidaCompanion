import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * /admin dashboard numbers (SPEC §10). Callers check requireRole("mod") first; the counts read
 * staff-only tables (ask_logs, ingest_runs, reports), so they use the service role and return
 * numbers only, never rows.
 */
export type DashboardData = {
  today: { threads: number; posts: number; asks: number; clipsPending: number; reportsOpen: number };
  askThumbsUpRate: number | null;
  askFeedbackCount: number;
  articles: { draft: number; review: number; scheduled: number; published: number };
  lastIngest: { sourceId: string; startedAt: string; finishedAt: string | null; pagesChanged: number } | null;
};

export function startOfUtcDay(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function getDashboardData(): Promise<DashboardData> {
  const admin = getAdminSupabase();
  const since = startOfUtcDay();
  const nowIso = new Date().toISOString();
  const count = async (promise: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: value, error } = await promise;
    if (error) console.error("[dashboard] count failed:", error.message);
    return value ?? 0;
  };
  const head = { count: "exact", head: true } as const;

  const [threads, posts, asks, clipsPending, reportsOpen, up, rated, draft, review, scheduled, published, ingest] =
    await Promise.all([
      count(admin.from("threads").select("id", head).gte("created_at", since)),
      count(admin.from("posts").select("id", head).gte("created_at", since)),
      count(admin.from("ask_logs").select("id", head).gte("created_at", since)),
      count(admin.from("clips").select("id", head).eq("status", "pending")),
      count(admin.from("reports").select("id", head).eq("status", "open")),
      count(admin.from("ask_logs").select("id", head).eq("feedback", 1)),
      count(admin.from("ask_logs").select("id", head).not("feedback", "is", null)),
      count(admin.from("articles").select("id", head).eq("status", "draft")),
      count(admin.from("articles").select("id", head).eq("status", "review")),
      count(admin.from("articles").select("id", head).eq("status", "published").gt("published_at", nowIso)),
      count(admin.from("articles").select("id", head).eq("status", "published").lte("published_at", nowIso)),
      admin
        .from("ingest_runs")
        .select("source_id, started_at, finished_at, pages_changed")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    today: { threads, posts, asks, clipsPending, reportsOpen },
    askThumbsUpRate: rated > 0 ? up / rated : null,
    askFeedbackCount: rated,
    articles: { draft, review, scheduled, published },
    lastIngest: ingest.data
      ? {
          sourceId: ingest.data.source_id,
          startedAt: ingest.data.started_at,
          finishedAt: ingest.data.finished_at,
          pagesChanged: ingest.data.pages_changed,
        }
      : null,
  };
}
