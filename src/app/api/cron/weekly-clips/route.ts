import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { env, integrations } from "@/env";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { parseWeekKey, previousWeekKey, isWeekOpen } from "@/lib/clips/week";
import { freezeWeeklyTop } from "@/server/admin/clips";
import { CLIPS_WEEKLY_TAG } from "@/server/clips/cache-tags";

/**
 * Weekly top 10 (SPEC §6, §12: Monday 06:00 UTC). Freezes the previous ISO week's ten best clips
 * into clip_weekly; a week that already has a snapshot stays as it is. `?week=2026-w47` backfills a
 * finished week. GET for Vercel Cron, POST for manual runs (D-012).
 */
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!integrations.supabaseAdmin) {
    console.info("[cron] weekly-clips skipped: SUPABASE_SECRET_KEY is not set.");
    return NextResponse.json({ skipped: "Supabase secret key missing" });
  }

  const requested = request.nextUrl.searchParams.get("week");
  const week = parseWeekKey(requested ?? previousWeekKey());
  if (!week) return NextResponse.json({ error: "Use a week like 2026-w47." }, { status: 400 });
  if (isWeekOpen(week)) return NextResponse.json({ error: "That week isn't over yet." }, { status: 400 });

  try {
    const result = await freezeWeeklyTop(week);
    if (result.created) revalidateTag(CLIPS_WEEKLY_TAG, "max");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] weekly-clips failed:", error);
    return NextResponse.json({ error: "Run failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
