"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { env, integrations } from "@/env";
import { hashIdentifier } from "@/lib/ratelimit/keys";
import { rateLimit } from "@/lib/ratelimit/limit";
import { recordAnonymousVote } from "@/server/admin/article-feedback";
import { getSession } from "@/server/auth/session";
import { requestContext } from "@/server/auth/request";
import { getPublicSupabase } from "@/server/supabase/public";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * "Was this helpful?" (SPEC §4): one vote per user or anonymous id, rate-limited per IP.
 * value 1 = 👍, -1 = 👎, 0 = take the vote back. Counts are kept by a database trigger.
 */
const ANON_COOKIE = "la_anon";
const voteSchema = z.object({ articleId: z.uuid(), value: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export type VoteResult = { ok: true; up: number; down: number } | { ok: false; message: string };

export async function voteHelpful(articleId: string, value: -1 | 0 | 1): Promise<VoteResult> {
  const parsed = voteSchema.safeParse({ articleId, value });
  if (!parsed.success || !integrations.supabase) return { ok: false, message: "That vote didn't work." };

  const { ip } = await requestContext();
  const limit = await rateLimit("helpfulVoteIp", ip);
  if (!limit.success) return { ok: false, message: "Too many votes. Please try again later." };

  const session = await getSession();
  if (session?.profile && !session.profile.banned) {
    const supabase = await createSupabaseServerClient();
    const voterKey = session.userId;
    const result =
      parsed.data.value === 0
        ? await supabase.from("article_feedback").delete().eq("article_id", articleId).eq("voter_key", voterKey)
        : await supabase
            .from("article_feedback")
            .upsert(
              { article_id: articleId, voter_key: voterKey, value: parsed.data.value },
              { onConflict: "article_id,voter_key" },
            );
    if (result.error) return { ok: false, message: "That vote didn't work." };
  } else {
    if (!integrations.supabaseAdmin || !env.ANON_HASH_SALT) return { ok: false, message: "Sign in to vote." };
    const jar = await cookies();
    let anonId = jar.get(ANON_COOKIE)?.value;
    if (!anonId || !/^[0-9a-f-]{36}$/.test(anonId)) {
      anonId = crypto.randomUUID();
      jar.set(ANON_COOKIE, anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    const voterKey = `anon:${hashIdentifier(anonId, env.ANON_HASH_SALT)}`;
    const recorded = await recordAnonymousVote(articleId, voterKey, parsed.data.value);
    if (!recorded.ok) return { ok: false, message: "That vote didn't work." };
  }

  const { data } = (await getPublicSupabase()
    ?.from("articles")
    .select("helpful_up, helpful_down")
    .eq("id", articleId)
    .maybeSingle()) ?? { data: null };
  return { ok: true, up: data?.helpful_up ?? 0, down: data?.helpful_down ?? 0 };
}
