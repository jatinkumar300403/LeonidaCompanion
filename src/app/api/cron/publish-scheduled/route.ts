import { NextResponse, type NextRequest } from "next/server";
import { ARTICLE_TYPES, type ArticleType } from "@/config/articles";
import { env, integrations } from "@/env";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { getAdminSupabase } from "@/server/admin/supabase";
import { runPublishPipeline } from "@/server/articles/pipeline";

/**
 * Scheduled publishing (SPEC §4, §12: every 10 minutes). An article scheduled for later is stored
 * as published with a future published_at, which RLS keeps hidden; once that time passes this
 * route runs the publish pipeline for it (cache tags, embedding, IndexNow) and records
 * pipeline_ran_at (D-052). GET for Vercel Cron, POST for manual runs; both need the bearer secret.
 */
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!integrations.supabaseAdmin) return NextResponse.json({ error: "Supabase secret key missing." }, { status: 503 });

  const admin = getAdminSupabase();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("articles")
    .select("id, type, slug, published_at, pipeline_ran_at")
    .eq("status", "published")
    .lte("published_at", now)
    .is("pipeline_ran_at", null)
    .order("published_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[cron] publish-scheduled query failed:", error.code, error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  const published: string[] = [];
  for (const row of data) {
    if (!(ARTICLE_TYPES as readonly string[]).includes(row.type)) continue;
    const { error: updateError } = await admin
      .from("articles")
      .update({ pipeline_ran_at: now })
      .eq("id", row.id)
      .is("pipeline_ran_at", null);
    if (updateError) {
      console.error("[cron] publish-scheduled update failed:", row.id, updateError.message);
      continue;
    }
    runPublishPipeline({ id: row.id, type: row.type as ArticleType, slug: row.slug }, "background");
    published.push(row.id);
  }
  return NextResponse.json({ published: published.length, ids: published });
}

export const GET = handle;
export const POST = handle;
