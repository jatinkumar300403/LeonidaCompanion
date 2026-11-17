import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * "Export my data" (SPEC §9): profile, threads, posts, votes, clips and Ask AI questions.
 * Uses the service role because ask_logs isn't readable by users; every query is filtered by the
 * signed-in user's verified id. Call only with that id.
 */
export async function buildUserExport(userId: string, email: string | null) {
  const admin = getAdminSupabase();
  const [profile, threads, posts, votes, clips, asks] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, platform, role, reputation, is_banned, banned_until, age_confirmed_at, terms_accepted_at, notify_email_replies, created_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("threads")
      .select(
        "id, category_id, title, slug, body_md, tags, is_spoiler, status, score, reply_count, created_at, edited_at",
      )
      .eq("author_id", userId)
      .order("created_at"),
    admin
      .from("posts")
      .select("id, thread_id, body_md, score, status, created_at, edited_at")
      .eq("author_id", userId)
      .order("created_at"),
    admin.from("votes").select("target_type, target_id, value, created_at").eq("user_id", userId).order("created_at"),
    admin
      .from("clips")
      .select("id, platform, url, title, caption, category, status, reject_reason, score, created_at, approved_at")
      .eq("submitted_by", userId)
      .order("created_at"),
    admin
      .from("ask_logs")
      .select("id, question, include_spoilers, answer, feedback, created_at")
      .eq("user_id", userId)
      .order("created_at"),
  ]);

  const failed = [profile, threads, posts, votes, clips, asks].find((result) => result.error);
  if (failed?.error) throw new Error(`Export query failed: ${failed.error.message}`);

  return {
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profile: profile.data,
    threads: threads.data ?? [],
    posts: posts.data ?? [],
    votes: votes.data ?? [],
    clips: clips.data ?? [],
    asks: asks.data ?? [],
  };
}
