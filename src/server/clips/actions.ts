"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { integrations } from "@/env";
import { clipErrorMessage } from "@/lib/clips/errors";
import type { RateLimitScope } from "@/lib/ratelimit/keys";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import {
  clipFieldErrors,
  clipReviewSchema,
  clipSubmitSchema,
  clipUrlSchema,
  clipVoteSchema,
} from "@/lib/validation/clip";
import { findClipByExternal, insertUserClip } from "@/server/admin/clips";
import { isTestIdentity } from "@/server/admin/test-auth";
import { getSession, type CompleteSession } from "@/server/auth/session";
import { requestContext } from "@/server/auth/request";
import { verifyTurnstileForm } from "@/server/auth/turnstile";
import { CLIPS_TAG, clipTag } from "@/server/clips/cache-tags";
import { devMockFetchFor } from "@/server/clips/dev-mock";
import { precheckClip } from "@/server/clips/hooks";
import { resolveClip, type ResolveOptions } from "@/server/clips/resolve";
import type { ResolveFailure } from "@/server/clips/types";
import { getFlags, MAINTENANCE_MESSAGE, writesPausedFor } from "@/server/flags";
import { logModerationAction } from "@/server/moderation/log";
import { excerptOf, recordPrecheck } from "@/server/moderation/precheck";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { ClipPlatform, ClipStatus } from "@/types/content";

/**
 * Clip writes (SPEC §6). Every action: a signed-in, onboarded, unbanned member; zod; Upstash
 * limits; Turnstile on the submission (a public write, CLAUDE.md). Links are always resolved
 * again on the server, so nothing the browser sends ends up in the clip's metadata (D-070).
 */

type Gate = { session: CompleteSession; test: boolean } | { error: string };

const GENERIC = "Something went wrong. Please try again.";
const CLOSED = "Clip submissions aren't open yet. Please check back soon.";

async function gate(
  scopes: RateLimitScope[],
  options: { formData?: FormData; ipScope?: RateLimitScope; staff?: boolean } = {},
): Promise<Gate> {
  const session = await getSession();
  if (!session) return { error: "Sign in first." };
  if (!session.profile) return { error: "Finish setting up your account first." };
  if (session.profile.banned) return { error: "Your account is suspended, so you can't do that right now." };
  if (options.staff && session.profile.role === "user") return { error: "Only moderators can do that." };
  if (writesPausedFor(await getFlags(), session.profile.role)) return { error: MAINTENANCE_MESSAGE };
  const complete = session as CompleteSession;

  // Dev test identities skip limits and Turnstile, like the forum (D-046, D-063).
  if (isTestIdentity(session.email ?? "")) return { session: complete, test: true };

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
  return { session: complete, test: false };
}

/** Under `next dev`, e2e identities resolve against the recorded fixtures (D-073). */
function resolveOptionsFor(session: CompleteSession): ResolveOptions {
  const mock = devMockFetchFor(session.email);
  return mock ? { fetch: mock, mock: true } : {};
}

const failureMessage = (failure: ResolveFailure) =>
  clipErrorMessage(failure.code, { platform: failure.platform, durationSec: failure.durationSec });

function duplicateMessage(status: ClipStatus): string {
  switch (status) {
    case "approved":
      return "This clip is already on the site.";
    case "pending":
      return "Someone already sent this clip. It's waiting for a moderator.";
    default:
      return "This clip was reviewed before and can't be sent again.";
  }
}

// ─── Preview ────────────────────────────────────────────────────────────────
export type ClipPreview = {
  platform: ClipPlatform;
  embedId: string;
  url: string;
  title: string;
  creatorName: string | null;
  creatorUrl: string | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  orientation: "landscape" | "portrait";
  existing: { id: number; status: ClipStatus; message: string } | null;
};

export type PreviewResult = { ok: true; preview: ClipPreview } | { ok: false; message: string };

/** The live preview card on /clips/submit: resolves the link and says if we already have it. */
export async function previewClip(rawUrl: unknown): Promise<PreviewResult> {
  const url = clipUrlSchema.safeParse(rawUrl);
  if (!url.success) return { ok: false, message: url.error.issues[0]?.message ?? "Paste a clip link first." };
  if (!integrations.supabaseAdmin) return { ok: false, message: CLOSED };
  const check = await gate(["clipResolve"], { ipScope: "clipResolveIp" });
  if ("error" in check) return { ok: false, message: check.error };

  const result = await resolveClip(url.data, resolveOptionsFor(check.session));
  if (!result.ok) return { ok: false, message: failureMessage(result) };
  const { clip } = result;

  let existing: ClipPreview["existing"] = null;
  try {
    const found = await findClipByExternal(clip.platform, clip.externalId);
    if (found) existing = { ...found, message: duplicateMessage(found.status) };
  } catch (error) {
    console.error("[clips] duplicate check failed", error);
  }
  return {
    ok: true,
    preview: {
      platform: clip.platform,
      embedId: clip.externalId,
      url: clip.url,
      title: clip.title,
      creatorName: clip.creatorName,
      creatorUrl: clip.creatorUrl,
      durationSec: clip.durationSec,
      thumbnailUrl: clip.thumbnailUrl,
      orientation: clip.orientation,
      existing,
    },
  };
}

// ─── Submit ─────────────────────────────────────────────────────────────────
export type SubmitClipState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string>; existingId?: number }
  | { status: "done"; clipId: number; title: string };

/** /clips/submit (useActionState): resolve again, dedupe, pre-check, insert as pending. */
export async function submitClip(_prev: SubmitClipState, formData: FormData): Promise<SubmitClipState> {
  const parsed = clipSubmitSchema.safeParse({
    url: formData.get("url") ?? "",
    category: formData.get("category") ?? "",
    caption: formData.get("caption") ?? "",
    notSpoiler: formData.get("notSpoiler") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: clipFieldErrors(parsed.error),
    };
  }
  if (!integrations.supabaseAdmin) return { status: "error", message: CLOSED };

  const check = await gate(["clipSubmit"], { formData, ipScope: "clipWriteIp" });
  if ("error" in check) return { status: "error", message: check.error };
  const { session } = check;
  const input = parsed.data;

  const result = await resolveClip(input.url, resolveOptionsFor(session));
  if (!result.ok) {
    const message = failureMessage(result);
    return { status: "error", message, fieldErrors: { url: message } };
  }
  const caption = input.caption || null;

  try {
    const existing = await findClipByExternal(result.clip.platform, result.clip.externalId);
    if (existing) {
      const message = duplicateMessage(existing.status);
      return {
        status: "error",
        message,
        fieldErrors: { url: message },
        existingId: existing.status === "approved" ? existing.id : undefined,
      };
    }

    const precheck = await precheckClip({ clip: result.clip, caption, session });
    const excerpt = excerptOf(result.clip.title, caption);
    if (precheck.action === "reject") {
      after(() => recordPrecheck(precheck, { targetId: null, session, excerpt }));
      return { status: "error", message: precheck.message ?? GENERIC };
    }

    const inserted = await insertUserClip(result.clip, { userId: session.userId, category: input.category, caption });
    if (!inserted.ok) {
      const message = duplicateMessage(inserted.duplicate.status);
      return { status: "error", message, fieldErrors: { url: message } };
    }
    // A hold stays pending like every submission; its labels go to the audit log for the reviewer.
    after(() => recordPrecheck(precheck, { targetId: inserted.id, session, excerpt }));
    return { status: "done", clipId: inserted.id, title: result.clip.title };
  } catch (error) {
    console.error("[clips] submit failed", error);
    return { status: "error", message: GENERIC };
  }
}

// ─── Votes ──────────────────────────────────────────────────────────────────
export type ClipActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string };

const VOTE_ERRORS: Record<string, string> = {
  cannot_vote_on_own_content: "You can't vote on your own clip.",
  vote_target_not_found: "This clip isn't open for votes.",
};

export async function voteClip(raw: unknown): Promise<ClipActionResult<{ score: number }>> {
  const parsed = clipVoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "That vote didn't work." };
  const { clipId, value } = parsed.data;
  const check = await gate(["clipVote"]);
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const userId = check.session.userId;
  const result =
    value === 0
      ? await supabase.from("votes").delete().match({ user_id: userId, target_type: "clip", target_id: clipId })
      : await supabase
          .from("votes")
          .upsert(
            { user_id: userId, target_type: "clip", target_id: clipId, value },
            { onConflict: "user_id,target_type,target_id" },
          );
  if (result.error) {
    const known = Object.entries(VOTE_ERRORS).find(([name]) => result.error.message.includes(name))?.[1];
    if (!known) console.error("[clips] vote failed:", result.error.code, result.error.message);
    return { ok: false, message: known ?? GENERIC };
  }
  const { data } = await supabase.from("clips").select("score").eq("id", clipId).maybeSingle();
  updateTag(clipTag(clipId));
  return { ok: true, score: data?.score ?? 0 };
}

// ─── Review (mods) ──────────────────────────────────────────────────────────
const REVIEW_STATUS = { approve: "approved", reject: "rejected", remove: "removed" } as const;

/** /admin/clips: approve (optionally re-categorised), reject or remove, each logged. */
export async function reviewClip(raw: unknown): Promise<ClipActionResult<{ status: ClipStatus }>> {
  const parsed = clipReviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That didn't work." };
  const input = parsed.data;
  const check = await gate(["clipReview"], { staff: true });
  if ("error" in check) return { ok: false, message: check.error };

  const supabase = await createSupabaseServerClient();
  const status = REVIEW_STATUS[input.decision];
  const changes =
    input.decision === "approve"
      ? { status, reject_reason: null, ...(input.category ? { category: input.category } : {}) }
      : { status, reject_reason: input.reason };
  const { data, error } = await supabase.from("clips").update(changes).eq("id", input.id).select("id").maybeSingle();
  if (error || !data) {
    if (error) console.error("[clips] review failed:", error.code, error.message);
    return { ok: false, message: error ? GENERIC : "That clip no longer exists." };
  }

  updateTag(CLIPS_TAG);
  updateTag(clipTag(input.id));
  const actorId = check.session.userId;
  after(() =>
    logModerationAction(supabase, {
      actorId,
      action: `clip_${input.decision}`,
      targetType: "clip",
      targetId: input.id,
      reason: input.decision === "approve" ? null : input.reason,
    }),
  );
  return { ok: true, status };
}
