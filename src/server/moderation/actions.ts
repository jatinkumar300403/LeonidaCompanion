"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { RateLimitScope } from "@/lib/ratelimit/keys";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import {
  banSchema,
  banUntil,
  contentDecisionSchema,
  moveThreadSchema,
  resolveReportsSchema,
  roleChangeSchema,
  unbanSchema,
  type ContentDecision,
} from "@/lib/validation/moderation";
import { isTestIdentity } from "@/server/admin/test-auth";
import { getSession, type CompleteSession } from "@/server/auth/session";
import { CLIPS_TAG, clipTag } from "@/server/clips/cache-tags";
import { FORUM_TAG, threadTag } from "@/server/forum/cache-tags";
import { logModerationAction } from "@/server/moderation/log";
import { excerptOf } from "@/server/moderation/precheck";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Moderation tools (SPEC §5 mod tools, §10 queue and users; D-084). Every action: a signed-in,
 * unbanned mod or admin, zod, an Upstash limit, then the write runs as the mod so RLS, the guards
 * and the notification triggers apply. Content actions are logged with logModerationAction; bans
 * and role changes go through RPCs that log themselves (D-083).
 */
export type ModResult = { ok: true; message: string } | { ok: false; message: string };

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Gate = { session: CompleteSession; supabase: Supabase } | { error: string };

const GENERIC = "Something went wrong. Please try again.";

async function staffGate(scope: RateLimitScope, role: "mod" | "admin" = "mod"): Promise<Gate> {
  const session = await getSession();
  if (!session?.profile) return { error: "Sign in first." };
  const { profile } = session;
  if (profile.banned) return { error: "Your account is suspended." };
  if (role === "admin" ? profile.role !== "admin" : profile.role === "user") {
    return { error: role === "admin" ? "Only admins can do that." : "Only moderators can do that." };
  }
  if (!isTestIdentity(session.email ?? "")) {
    const limit = await rateLimit(scope, session.userId);
    if (!limit.success) return { error: rateLimitMessage(limit.retryAfterSeconds) };
  }
  return { session: session as CompleteSession, supabase: await createSupabaseServerClient() };
}

// ─── Content decisions ──────────────────────────────────────────────────────
type Applied = { ok: true; message: string } | { ok: false; message: string };

const DONE: Record<ContentDecision, string> = {
  approve: "Approved.",
  remove: "Removed.",
  restore: "Restored.",
  lock: "Locked.",
  unlock: "Unlocked.",
};

/** Applies one decision as the mod and logs it. Shared by the Held queue and the Reports queue. */
async function applyDecision(
  gate: { session: CompleteSession; supabase: Supabase },
  input: { targetType: "thread" | "post" | "clip"; id: number; decision: ContentDecision; reason: string | null },
): Promise<Applied> {
  const { supabase, session } = gate;
  const { targetType, id, decision, reason } = input;
  let subjectId: string | null = null;
  let excerpt: string | null = null;

  if (targetType === "thread") {
    const { data: thread } = await supabase
      .from("threads")
      .select("id, status, accepted_post_id, author_id, title")
      .eq("id", id)
      .maybeSingle();
    if (!thread) return { ok: false, message: "That thread no longer exists." };
    const reopen = thread.accepted_post_id ? "solved" : "open";
    // Each decision only applies from the states where it makes sense.
    const plan: Record<ContentDecision, { to: string; from: string[] }> = {
      approve: { to: reopen, from: ["held"] },
      remove: { to: "removed", from: ["open", "solved", "locked", "held"] },
      restore: { to: reopen, from: ["removed"] },
      lock: { to: "locked", from: ["open", "solved"] },
      unlock: { to: reopen, from: ["locked"] },
    };
    const step = plan[decision];
    if (!step.from.includes(thread.status)) return { ok: false, message: `That thread is already ${thread.status}.` };
    const { data, error } = await supabase
      .from("threads")
      .update({ status: step.to })
      .eq("id", id)
      .eq("status", thread.status)
      .select("id");
    if (error || !data?.length) {
      if (error) console.error("[moderation] thread decision failed:", error.code, error.message);
      return { ok: false, message: error ? GENERIC : "That thread changed in the meantime. Reload and try again." };
    }
    subjectId = thread.author_id;
    excerpt = excerptOf(thread.title);
    updateTag(FORUM_TAG);
    updateTag(threadTag(id));
  } else if (targetType === "post") {
    const { data: post } = await supabase
      .from("posts")
      .select("id, status, thread_id, author_id, body_md")
      .eq("id", id)
      .maybeSingle();
    if (!post) return { ok: false, message: "That reply no longer exists." };
    const plan: Partial<Record<ContentDecision, { to: string; from: string[] }>> = {
      approve: { to: "visible", from: ["held"] },
      remove: { to: "removed", from: ["visible", "held"] },
      restore: { to: "visible", from: ["removed"] },
    };
    const step = plan[decision];
    if (!step) return { ok: false, message: "That action doesn't apply to replies." };
    if (!step.from.includes(post.status)) return { ok: false, message: `That reply is already ${post.status}.` };
    const { data, error } = await supabase
      .from("posts")
      .update({ status: step.to })
      .eq("id", id)
      .eq("status", post.status)
      .select("id");
    if (error || !data?.length) {
      if (error) console.error("[moderation] reply decision failed:", error.code, error.message);
      return { ok: false, message: error ? GENERIC : "That reply changed in the meantime. Reload and try again." };
    }
    subjectId = post.author_id;
    excerpt = excerptOf(post.body_md);
    updateTag(FORUM_TAG);
    updateTag(threadTag(post.thread_id));
  } else {
    // Clips: only removal from a report. Approving and rejecting stay in /admin/clips.
    const { data, error } = await supabase
      .from("clips")
      .update({ status: "removed", reject_reason: reason })
      .eq("id", id)
      .neq("status", "removed")
      .select("id, submitted_by, title");
    if (error || !data?.length) {
      if (error) console.error("[moderation] clip removal failed:", error.code, error.message);
      return { ok: false, message: error ? GENERIC : "That clip is already removed or gone." };
    }
    subjectId = data[0]!.submitted_by;
    excerpt = excerptOf(data[0]!.title);
    updateTag(CLIPS_TAG);
    updateTag(clipTag(id));
  }

  await logModerationAction(supabase, {
    actorId: session.userId,
    action: `${targetType}_${decision}`,
    targetType,
    targetId: id,
    reason,
    subjectId,
    excerpt,
  });
  return { ok: true, message: DONE[decision] };
}

/** Held queue and report cards: approve, remove, restore, lock or unlock one item. */
export async function decideContent(raw: unknown): Promise<ModResult> {
  const parsed = contentDecisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That didn't work." };
  const gate = await staffGate("modAction");
  if ("error" in gate) return { ok: false, message: gate.error };
  return applyDecision(gate, parsed.data);
}

/** Move a thread to another category (SPEC §5 mod tools). */
export async function moveThread(raw: unknown): Promise<ModResult> {
  const parsed = moveThreadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Pick a category." };
  const gate = await staffGate("modAction");
  if ("error" in gate) return { ok: false, message: gate.error };
  const { supabase, session } = gate;

  const [{ data: thread }, { data: category }] = await Promise.all([
    supabase.from("threads").select("id, category_id, author_id, title").eq("id", parsed.data.id).maybeSingle(),
    supabase.from("forum_categories").select("id, name").eq("id", parsed.data.categoryId).maybeSingle(),
  ]);
  if (!thread) return { ok: false, message: "That thread no longer exists." };
  if (!category) return { ok: false, message: "That category doesn't exist." };
  if (thread.category_id === category.id) return { ok: false, message: `It's already in ${category.name}.` };

  const { error } = await supabase.from("threads").update({ category_id: category.id }).eq("id", thread.id);
  if (error) {
    console.error("[moderation] move failed:", error.code, error.message);
    return { ok: false, message: GENERIC };
  }
  updateTag(FORUM_TAG);
  updateTag(threadTag(thread.id));
  await logModerationAction(supabase, {
    actorId: session.userId,
    action: "thread_move",
    targetType: "thread",
    targetId: thread.id,
    reason: `Moved to ${category.name}`,
    subjectId: thread.author_id,
    excerpt: excerptOf(thread.title),
  });
  return { ok: true, message: `Moved to ${category.name}.` };
}

// ─── Reports ────────────────────────────────────────────────────────────────
/** Resolves every open report on one target, optionally removing the target first. */
export async function resolveReports(raw: unknown): Promise<ModResult> {
  const parsed = resolveReportsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That didn't work." };
  const input = parsed.data;
  const gate = await staffGate("modAction");
  if ("error" in gate) return { ok: false, message: gate.error };
  const { supabase, session } = gate;

  let message = input.outcome === "dismissed" ? "Reports dismissed." : "Marked as handled.";
  if (input.remove) {
    const targetType = input.targetType as "thread" | "post" | "clip";
    const id = Number(input.targetId);
    if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, message: "That item doesn't exist." };
    const removed = await applyDecision(gate, {
      targetType,
      id,
      decision: "remove",
      reason: input.reason ?? (targetType === "clip" ? "Removed after a report" : null),
    });
    // Already removed (by another mod) still lets the reports close.
    if (!removed.ok && !removed.message.includes("already")) return removed;
    message = "Removed. Reports closed.";
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ status: input.outcome, resolved_by: session.userId, resolved_at: new Date().toISOString() })
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("status", "open")
    .select("id");
  if (error) {
    console.error("[moderation] resolving reports failed:", error.code, error.message);
    return { ok: false, message: GENERIC };
  }
  if (input.outcome === "dismissed") {
    await logModerationAction(supabase, {
      actorId: session.userId,
      action: "reports_dismissed",
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? `${data?.length ?? 0} report(s)`,
    });
  }
  return { ok: true, message };
}

// ─── Users: bans and roles (RPCs, D-083) ────────────────────────────────────
const RPC_ERRORS: Record<string, string> = {
  not_allowed: "You can't do that.",
  cannot_ban_self: "You can't ban yourself.",
  cannot_ban_staff: "Admins can't be banned, and only admins can ban moderators.",
  ban_end_in_past: "Pick a ban length.",
  reason_required: "Say why (the member sees it).",
  user_not_found: "That user doesn't exist any more.",
  cannot_change_own_role: "You can't change your own role.",
  invalid_role: "Pick a role.",
};

function rpcFailure(error: { code?: string; message: string }, what: string): ModResult {
  const known = Object.entries(RPC_ERRORS).find(([name]) => error.message.includes(name))?.[1];
  if (!known) console.error(`[moderation] ${what} failed:`, error.code, error.message);
  return { ok: false, message: known ?? GENERIC };
}

function refreshUserPages(userId: string): void {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function banUser(raw: unknown): Promise<ModResult> {
  const parsed = banSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That didn't work." };
  const gate = await staffGate("modBan");
  if ("error" in gate) return { ok: false, message: gate.error };
  const until = banUntil(parsed.data.duration);
  const { error } = await gate.supabase.rpc("mod_ban_user", {
    p_user_id: parsed.data.userId,
    // null = permanent; the generated RPC types don't model nullable arguments.
    p_until: until as string,
    p_reason: parsed.data.reason,
  });
  if (error) return rpcFailure(error, "ban");
  refreshUserPages(parsed.data.userId);
  return { ok: true, message: until ? "Banned. They can read but not post until it ends." : "Banned permanently." };
}

export async function unbanUser(raw: unknown): Promise<ModResult> {
  const parsed = unbanSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "That user doesn't exist." };
  const gate = await staffGate("modBan");
  if ("error" in gate) return { ok: false, message: gate.error };
  const { error } = await gate.supabase.rpc("mod_unban_user", {
    p_user_id: parsed.data.userId,
    p_reason: parsed.data.reason as string,
  });
  if (error) return rpcFailure(error, "unban");
  refreshUserPages(parsed.data.userId);
  return { ok: true, message: "Ban lifted." };
}

/** Admins only (SPEC §10 "change role (admin only)"). */
export async function setUserRole(raw: unknown): Promise<ModResult> {
  const parsed = roleChangeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Pick a role." };
  const gate = await staffGate("modBan", "admin");
  if ("error" in gate) return { ok: false, message: gate.error };
  const { error } = await gate.supabase.rpc("admin_set_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return rpcFailure(error, "role change");
  refreshUserPages(parsed.data.userId);
  return { ok: true, message: "Role updated." };
}
