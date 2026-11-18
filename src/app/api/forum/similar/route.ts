import { NextResponse, type NextRequest } from "next/server";
import { threadHref } from "@/lib/notifications/format";
import { clientIp } from "@/lib/ratelimit/keys";
import { rateLimit } from "@/lib/ratelimit/limit";
import { findSimilarThreads } from "@/server/forum/queries";

/**
 * GET /api/forum/similar?q=… → threads with a similar title while someone types a new one
 * (SPEC §5 /forum/new: fewer duplicates). Trigram search under RLS; rate-limited per IP.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 140);
  if (q.length < 6) return NextResponse.json({ threads: [] });

  const limit = await rateLimit("forumSimilarIp", clientIp(request.headers));
  if (!limit.success) {
    return NextResponse.json(
      { threads: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const threads = await findSimilarThreads(q, 5);
  return NextResponse.json(
    {
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        url: threadHref(thread.id, thread.slug),
        solved: thread.status === "solved",
        replyCount: thread.replyCount,
      })),
    },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
