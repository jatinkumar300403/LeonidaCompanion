import "server-only";
import { cache } from "react";
import { isStaff } from "@/lib/forum/rules";
import type { VoteValue } from "@/lib/forum/reputation";
import { getSession } from "@/server/auth/session";
import { POST_COLUMNS, toPost, type ThreadDetail } from "@/server/forum/model";
import { fetchThread, getThread, loadAuthors } from "@/server/forum/queries";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Per-request forum data for the signed-in viewer (D-064): who they are, whom they blocked, their
 * votes, and content only they (or staff) may see. Public data stays cached; this sits on top.
 */
export type ForumViewer = {
  id: string;
  username: string;
  role: string;
  reputation: number;
  createdAt: string;
  banned: boolean;
  staff: boolean;
  blocked: Set<string>;
};

export const getForumViewer = cache(async (): Promise<ForumViewer | null> => {
  const session = await getSession();
  if (!session?.profile) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.userId);
  const profile = session.profile;
  return {
    id: session.userId,
    username: profile.username,
    role: profile.role,
    reputation: profile.reputation,
    createdAt: profile.createdAt,
    banned: profile.banned,
    staff: isStaff(profile.role) && !profile.banned,
    blocked: new Set((data ?? []).map((row) => row.blocked_id)),
  };
});

/** The viewer's votes on these threads and posts, keyed "thread:1" / "post:2". */
export async function getMyVotes(
  viewer: ForumViewer | null,
  targets: { threads?: number[]; posts?: number[] },
): Promise<Map<string, VoteValue>> {
  const votes = new Map<string, VoteValue>();
  const ids = [...(targets.threads ?? []), ...(targets.posts ?? [])];
  if (!viewer || ids.length === 0) return votes;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("votes")
    .select("target_type, target_id, value")
    .eq("user_id", viewer.id)
    .in("target_type", ["thread", "post"])
    .in("target_id", [...new Set(ids)]);
  if (error) console.error("[forum] votes failed:", error.code, error.message);
  for (const row of data ?? []) votes.set(`${row.target_type}:${row.target_id}`, row.value as VoteValue);
  return votes;
}

/** `now`: the time edit windows are judged against for this render. */
export type ThreadForViewer = { thread: ThreadDetail; hiddenFromPublic: boolean; now: number };

/**
 * The thread page's data. Visitors and members get the cached public copy, plus their own held or
 * removed replies. Staff, and the author of a thread the public can't see (held or removed), read
 * it live as themselves, so RLS decides.
 */
export async function getThreadForViewer(id: number, viewer: ForumViewer | null): Promise<ThreadForViewer | null> {
  const now = Date.now();
  const publicThread = await getThread(id);
  if (!viewer) return publicThread ? { thread: publicThread, hiddenFromPublic: false, now } : null;

  const supabase = await createSupabaseServerClient();
  if (viewer.staff || !publicThread) {
    const live = await fetchThread(supabase, id);
    if (!live) return null;
    return { thread: live, hiddenFromPublic: !publicThread, now };
  }

  const { data: own } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("thread_id", id)
    .eq("author_id", viewer.id)
    .in("status", ["held", "removed"]);
  if (!own || own.length === 0) return { thread: publicThread, hiddenFromPublic: false, now };

  const authors = await loadAuthors(supabase, [viewer.id]);
  const merged = [...publicThread.posts, ...own.map((row) => toPost(row, authors))].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id,
  );
  return { thread: { ...publicThread, posts: merged }, hiddenFromPublic: false, now };
}
