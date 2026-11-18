"use server";

import type { Route } from "next";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { slugify } from "@/lib/articles/slug";
import { forumErrorMessage, type DbError } from "@/lib/forum/errors";
import { canEdit, isCategoryReadOnly, writeLimitScope } from "@/lib/forum/rules";
import type { RateLimitScope } from "@/lib/ratelimit/keys";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { routes } from "@/lib/routes";
import {
  forumFieldErrors,
  postEditSchema,
  postInputSchema,
  reportSchema,
  threadEditSchema,
  threadInputSchema,
  uuidSchema,
  voteSchema,
} from "@/lib/validation/forum";
import { isTestIdentity } from "@/server/admin/test-auth";
import { getSession, type CompleteSession } from "@/server/auth/session";
import { requestContext } from "@/server/auth/request";
import { verifyTurnstileForm } from "@/server/auth/turnstile";
import { getFlags } from "@/server/flags";
import { FORUM_TAG, threadTag } from "@/server/forum/cache-tags";
import { enqueueForumSolutionEmbedding, removeForumSolutionEmbedding } from "@/server/forum/embedding";
import { onThreadCreated } from "@/server/forum/hooks";
import { getCategoryById } from "@/server/forum/queries";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Forum writes (SPEC §5). Every action: a signed-in, onboarded, unbanned member; zod; an Upstash
 * limit; Turnstile on new threads and replies (D-063); then the write runs as the member, so RLS
 * and the forum triggers have the last word (D-061, D-062). Afterwards the cache tags are updated
 * so the writer sees the change at once.
 */
export type ForumResult<T extends object = object> =
  ({ ok: true; message: string } & T) | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type FormState = { status: "idle" } | { status: "error"; message: string; fieldErrors?: Record<string, string> };

type Gate = { session: CompleteSession; trusted: boolean } | { error: string };

const GENERIC = "Something went wrong. Please try again.";

async function gate(
  scopes: RateLimitScope[],
  options: { formData?: FormData; ipScope?: RateLimitScope } = {},
): Promise<Gate> {
  const session = await getSession();
  if (!session) return { error: "Sign in first." };
  if (!session.profile) return { error: "Finish setting up your account first." };
  if (session.profile.banned) return { error: "Your account is suspended, so you can't do that right now." };
  const complete = session as CompleteSession;

  // Dev test identities skip limits and Turnstile, like sign-in and onboarding (D-046, D-060).
  if (isTestIdentity(session.email ?? "")) return { session: complete, trusted: true };

  const { ip } = await requestContext();
  const checks = scopes.map((scope) => rateLimit(scope, session.userId));
  if (options.ipScope) checks.push(rateLimit(options.ipScope, ip));
  for (const check of await Promise.all(checks)) {
    if (!check.success) return { error: rateLimitMessage(check.retryAfterSeconds) };
  }
  if (options.formData) {
    const turnstile = await verifyTurnstileForm(options.formData, ip);
    if (!turnstile.ok) return { error: turnstile.error };
  }
  return { session: complete, trusted: false };
}

function failure(error: DbError, what: string): { ok: false; message: string } {
  const known = forumErrorMessage(error);
  if (!known) console.error(`[forum] ${what} failed:`, error.code, error.message);
  return { ok: false, message: known ?? GENERIC };
}

function invalidate(threadId?: number, lists = true): void {
  if (lists) updateTag(FORUM_TAG);
  if (threadId) updateTag(threadTag(threadId));
}

const threadSlug = (title: string) => slugify(title, 80) || "thread";

// ─── Threads ────────────────────────────────────────────────────────────────
/** /forum/new (useActionState). Redirects to the new thread on success. */
export async function createThread(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = threadInputSchema.safeParse({
    categoryId: formData.get("categoryId") ?? "",
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    tags: formData.getAll("tags"),
    isSpoiler: formData.get("isSpoiler") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: forumFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  const category = await getCategoryById(input.categoryId);
  if (!category)
    return { status: "error", message: "Pick a category.", fieldErrors: { categoryId: "Pick a category." } };

  const session = await getSession();
  const reputation = session?.profile?.reputation ?? 0;
  const check = await gate([writeLimitScope("thread", reputation)], { formData, ipScope: "forumWriteIp" });
  if ("error" in check) return { status: "error", message: check.error };
  const { session: member } = check;
  const staff = member.profile.role !== "user";
  if (!staff && isCategoryReadOnly(category, await getFlags())) {
    return {
      status: "error",
      message: `${category.name} is read-only for now.`,
      fieldErrors: { categoryId: "Pick another category." },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("threads")
    .insert({
      category_id: category.id,
      author_id: member.userId,
      title: input.title,
      slug: threadSlug(input.title),
      body_md: input.body,
      tags: input.tags,
      // Missions & Story: every post sits behind a spoiler warning (SPEC §5).
      is_spoiler: category.spoilersAllowed || input.isSpoiler,
      status: "open",
    })
    .select("id, slug")
    .single();
  if (error) return { status: "error", message: failure(error, "create thread").message };

  invalidate();
  after(() =>
    onThreadCreated({
      id: data.id,
      slug: data.slug,
      title: input.title,
      bodyMd: input.body,
      categoryId: category.id,
      isQa: category.isQa,
      isSpoiler: category.spoilersAllowed || input.isSpoiler,
      authorId: member.userId,
    }),
  );
  redirect(routes.thread(data.id, data.slug));
}

export async function editThread(raw: unknown): Promise<ForumResult<{ url: Route }>> {
  const parsed = threadEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: forumFieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const check = await gate(["forumEdit"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("id, author_id, category_id, created_at, title, slug")
    .eq("id", input.threadId)
    .maybeSingle();
  if (!thread) return { ok: false, message: "That thread no longer exists." };
  const viewer = { id: check.session.userId, role: check.session.profile.role };
  if (!canEdit({ createdAt: thread.created_at, authorId: thread.author_id }, viewer)) {
    return { ok: false, message: forumErrorMessage({ message: "edit_window_closed" })! };
  }
  const category = await getCategoryById(thread.category_id);
  const slug = input.title === thread.title ? thread.slug : threadSlug(input.title);

  const { error } = await supabase
    .from("threads")
    .update({
      title: input.title,
      slug,
      body_md: input.body,
      tags: input.tags,
      is_spoiler: Boolean(category?.spoilersAllowed) || input.isSpoiler,
    })
    .eq("id", input.threadId);
  if (error) return failure(error, "edit thread");

  invalidate(input.threadId);
  return { ok: true, message: "Thread updated.", url: routes.thread(input.threadId, slug) };
}

/** No replies: the thread is deleted. With replies: its question becomes "[deleted]" (D-061). */
export async function deleteThread(threadId: number): Promise<ForumResult<{ url: Route | null }>> {
  const id = Number(threadId);
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, message: "That thread doesn't exist." };
  const check = await gate(["forumDelete"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("id, author_id, category_id, reply_count")
    .eq("id", id)
    .maybeSingle();
  if (!thread) return { ok: false, message: "That thread no longer exists." };
  if (thread.author_id !== check.session.userId && check.session.profile.role === "user") {
    return { ok: false, message: "Only the author can delete this thread." };
  }

  const category = await getCategoryById(thread.category_id);
  if (thread.reply_count === 0) {
    const { data, error } = await supabase.from("threads").delete().eq("id", id).select("id");
    if (error) return failure(error, "delete thread");
    if (data.length > 0) {
      invalidate(id);
      return {
        ok: true,
        message: "Thread deleted.",
        url: category ? routes.forumCategory(category.slug) : ("/forum" as Route),
      };
    }
  }
  const { error } = await supabase.from("threads").update({ body_md: "[deleted]" }).eq("id", id);
  if (error) return failure(error, "soft-delete thread");
  invalidate(id);
  return { ok: true, message: "Your question was deleted. The replies stay.", url: null };
}

// ─── Replies ────────────────────────────────────────────────────────────────
export type ReplyState =
  | { status: "idle" }
  | { status: "posted"; postId: number; at: number }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** The reply composer (useActionState). */
export async function createPost(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const parsed = postInputSchema.safeParse({
    threadId: formData.get("threadId") ?? "",
    body: formData.get("body") ?? "",
    replyToPostId: formData.get("replyToPostId") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix your reply.", fieldErrors: forumFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const session = await getSession();
  const check = await gate([writeLimitScope("post", session?.profile?.reputation ?? 0)], {
    formData,
    ipScope: "forumWriteIp",
  });
  if ("error" in check) return { status: "error", message: check.error };
  const { session: member } = check;

  const supabase = await createSupabaseServerClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("id, status, category_id")
    .eq("id", input.threadId)
    .maybeSingle();
  if (!thread) return { status: "error", message: "That thread no longer exists." };
  const staff = member.profile.role !== "user";
  if (!staff) {
    if (thread.status === "locked") return { status: "error", message: "This thread is locked." };
    const category = await getCategoryById(thread.category_id);
    if (category && isCategoryReadOnly(category, await getFlags())) {
      return { status: "error", message: `${category.name} is read-only for now.` };
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      thread_id: input.threadId,
      author_id: member.userId,
      body_md: input.body,
      status: "visible",
      reply_to_post_id: input.replyToPostId,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: failure(error, "reply").message };

  invalidate(input.threadId);
  return { status: "posted", postId: data.id, at: Date.now() };
}

export async function editPost(raw: unknown): Promise<ForumResult> {
  const parsed = postEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please fix your reply.", fieldErrors: forumFieldErrors(parsed.error) };
  }
  const check = await gate(["forumEdit"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, thread_id, author_id, created_at")
    .eq("id", parsed.data.postId)
    .maybeSingle();
  if (!post) return { ok: false, message: "That reply no longer exists." };
  const viewer = { id: check.session.userId, role: check.session.profile.role };
  if (!canEdit({ createdAt: post.created_at, authorId: post.author_id }, viewer)) {
    return { ok: false, message: forumErrorMessage({ message: "edit_window_closed" })! };
  }
  const { error } = await supabase.from("posts").update({ body_md: parsed.data.body }).eq("id", post.id);
  if (error) return failure(error, "edit reply");
  invalidate(post.thread_id, false);
  return { ok: true, message: "Reply updated." };
}

/** Soft delete (SPEC §5): the reply shows "[deleted]" and stops counting. */
export async function deletePost(postId: number): Promise<ForumResult> {
  const id = Number(postId);
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, message: "That reply doesn't exist." };
  const check = await gate(["forumDelete"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase.from("posts").select("id, thread_id, author_id").eq("id", id).maybeSingle();
  if (!post) return { ok: false, message: "That reply no longer exists." };
  if (post.author_id !== check.session.userId && check.session.profile.role === "user") {
    return { ok: false, message: "Only the author can delete this reply." };
  }
  const { error } = await supabase.from("posts").update({ status: "deleted" }).eq("id", id);
  if (error) return failure(error, "delete reply");
  invalidate(post.thread_id);
  return { ok: true, message: "Reply deleted." };
}

// ─── Votes and accepted answers ─────────────────────────────────────────────
export async function vote(raw: unknown): Promise<ForumResult<{ score: number }>> {
  const parsed = voteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "That vote didn't work." };
  const { targetType, targetId, value } = parsed.data;
  const check = await gate(["forumVote"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const userId = check.session.userId;
  const result =
    value === 0
      ? await supabase
          .from("votes")
          .delete()
          .eq("user_id", userId)
          .eq("target_type", targetType)
          .eq("target_id", targetId)
      : await supabase
          .from("votes")
          .upsert(
            { user_id: userId, target_type: targetType, target_id: targetId, value },
            { onConflict: "user_id,target_type,target_id" },
          );
  if (result.error) return failure(result.error, "vote");

  let threadId = targetId;
  let score = 0;
  if (targetType === "post") {
    const { data } = await supabase.from("posts").select("score, thread_id").eq("id", targetId).maybeSingle();
    threadId = data?.thread_id ?? 0;
    score = data?.score ?? 0;
  } else {
    const { data } = await supabase.from("threads").select("score").eq("id", targetId).maybeSingle();
    score = data?.score ?? 0;
  }
  if (threadId) invalidate(threadId, false);
  return { ok: true, message: "Vote saved.", score };
}

/** The thread author or a mod marks one reply as the answer (Q&A categories), or clears it. */
export async function setAcceptedAnswer(threadId: number, postId: number | null): Promise<ForumResult> {
  const id = Number(threadId);
  const answer = postId === null ? null : Number(postId);
  if (!Number.isSafeInteger(id) || id <= 0 || (answer !== null && (!Number.isSafeInteger(answer) || answer <= 0))) {
    return { ok: false, message: "That didn't work." };
  }
  const check = await gate(["forumAccept"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("id, author_id, category_id")
    .eq("id", id)
    .maybeSingle();
  if (!thread) return { ok: false, message: "That thread no longer exists." };
  const staff = check.session.profile.role !== "user";
  if (thread.author_id !== check.session.userId && !staff) {
    return { ok: false, message: "Only the person who asked (or a moderator) can accept an answer." };
  }
  const category = await getCategoryById(thread.category_id);
  if (!category?.isQa) return { ok: false, message: "Answers can be accepted in Help & Questions only." };

  const { error } = await supabase.from("threads").update({ accepted_post_id: answer }).eq("id", id);
  if (error) return failure(error, "accept answer");

  invalidate(id);
  after(() => (answer ? enqueueForumSolutionEmbedding(id, answer) : removeForumSolutionEmbedding(id)));
  return { ok: true, message: answer ? "Marked as the answer. Thread solved." : "Answer unmarked." };
}

// ─── Safety: reports and blocks ─────────────────────────────────────────────
/** SPEC §5: reports land in the queue Phase 6 builds. */
export async function reportContent(raw: unknown): Promise<ForumResult> {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Pick a reason.", fieldErrors: forumFieldErrors(parsed.error) };
  }
  const check = await gate(["forumReport"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: check.session.userId,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return failure(error, "report");
  return { ok: true, message: "Thanks. A moderator will take a look." };
}

/** SPEC §5: blocking hides their content for you and stops their mentions and notifications. */
export async function setBlocked(userId: string, blocked: boolean): Promise<ForumResult> {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, message: "That user doesn't exist." };
  const check = await gate(["forumBlock"]);
  if ("error" in check) return { ok: false, message: check.error };
  if (parsed.data === check.session.userId) return { ok: false, message: "You can't block yourself." };

  const supabase = await createSupabaseServerClient();
  const result = blocked
    ? await supabase
        .from("blocks")
        .upsert(
          { blocker_id: check.session.userId, blocked_id: parsed.data },
          { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
        )
    : await supabase.from("blocks").delete().eq("blocker_id", check.session.userId).eq("blocked_id", parsed.data);
  if (result.error) return failure(result.error, "block");
  return { ok: true, message: blocked ? "Blocked. You won't see their posts or hear from them." : "Unblocked." };
}
