import { NextResponse, type NextRequest } from "next/server";
import { env, integrations } from "@/env";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { insertAutoClips } from "@/server/admin/clips";
import { fetchTwitchCandidates } from "@/server/clips/auto";
import { UpstreamError } from "@/server/clips/http";
import { twitchDepsFromEnv } from "@/server/clips/resolve";

/**
 * Twitch auto-candidates (SPEC §6, §12: hourly). Pulls the top GTA VI clips of the last 24 h and
 * inserts the new ones as pending `twitch_auto` clips for the review queue. Without the Twitch
 * keys it does nothing and says so. GET for Vercel Cron, POST for manual runs (D-012).
 */
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deps = twitchDepsFromEnv();
  if (!deps) {
    console.info("[cron] twitch-clips skipped: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET are not set.");
    return NextResponse.json({ skipped: "Twitch keys missing" });
  }
  if (!integrations.supabaseAdmin) {
    console.info("[cron] twitch-clips skipped: SUPABASE_SECRET_KEY is not set.");
    return NextResponse.json({ skipped: "Supabase secret key missing" });
  }

  try {
    const { gameId, fetched, candidates } = await fetchTwitchCandidates(deps);
    if (!gameId) return NextResponse.json({ skipped: "Twitch has no GTA VI category yet" });
    const inserted = await insertAutoClips(candidates);
    return NextResponse.json({ fetched, candidates: candidates.length, inserted });
  } catch (error) {
    const message = error instanceof UpstreamError ? error.message : "Run failed.";
    console.error("[cron] twitch-clips failed:", error);
    return NextResponse.json({ error: message }, { status: error instanceof UpstreamError ? 502 : 500 });
  }
}

export const GET = handle;
export const POST = handle;
