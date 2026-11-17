import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * Anonymous "Was this helpful?" votes (SPEC §4). Anonymous visitors have no database identity,
 * so the server writes their vote with the service role after checking the article is live;
 * voter_key is a salted hash of their anonymous cookie id (D-053). Signed-in votes go through
 * RLS as the user instead (src/server/articles/feedback.ts).
 */
export async function recordAnonymousVote(articleId: string, voterKey: string, value: -1 | 0 | 1) {
  const admin = getAdminSupabase();
  const { data: article } = await admin
    .from("articles")
    .select("id")
    .eq("id", articleId)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!article) return { ok: false as const };

  const result =
    value === 0
      ? await admin.from("article_feedback").delete().eq("article_id", articleId).eq("voter_key", voterKey)
      : await admin
          .from("article_feedback")
          .upsert({ article_id: articleId, voter_key: voterKey, value }, { onConflict: "article_id,voter_key" });
  if (result.error) {
    console.error("[feedback] anonymous vote failed:", result.error.code, result.error.message);
    return { ok: false as const };
  }
  return { ok: true as const };
}
