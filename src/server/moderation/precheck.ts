import "server-only";
import { integrations } from "@/env";
import { isNewAccount, isStaff } from "@/lib/forum/rules";
import { NEW_ACCOUNT_LABEL, type ModerationAction, type ModerationKind } from "@/lib/moderation/labels";
import { moderationMessage } from "@/lib/moderation/messages";
import type { FallbackCause } from "@/lib/moderation/verdict";
import { logAiAction, notifyAdmins } from "@/server/admin/moderation";
import { isTestIdentity } from "@/server/admin/test-auth";
import { fastModel, getAnthropic } from "@/server/ai/client";
import type { ModerationInput } from "@/server/ai/prompts";
import type { CompleteSession } from "@/server/auth/session";
import { getFlags, type Flags } from "@/server/flags";
import { classifyContent, type ModerationClient } from "@/server/moderation/ai";
import { devMockModerationClient } from "@/server/moderation/dev-mock";

/**
 * The pre-check every member write goes through (SPEC §8.2, D-080): threads, replies and their
 * edits, clip submissions, and profile bios. Staff are not checked. When the shadow-hold flag is on
 * (spam attack), new accounts' content is held even when the AI allows it. Never throws.
 */
export type PrecheckResult = {
  kind: ModerationKind;
  action: ModerationAction;
  labels: string[];
  reason: string;
  sendBack: boolean;
  source: "ai" | "fallback" | "staff";
  fallback: FallbackCause | null;
  shadowHold: boolean;
  /** What to tell the member (null when allowed). */
  message: string | null;
};

export type PrecheckDeps = {
  client(session: CompleteSession): ModerationClient | null;
  model(): string;
  flags(): Promise<Flags>;
};

const defaultDeps: PrecheckDeps = {
  // E2E identities under `next dev` get the marker-driven fake (D-080).
  client: (session) => (isTestIdentity(session.email ?? "") ? devMockModerationClient : getAnthropic()),
  model: fastModel,
  flags: getFlags,
};

export type PrecheckInput = Omit<ModerationInput, "kind"> & { kind: ModerationKind; session: CompleteSession };

export async function precheckContent(input: PrecheckInput, deps: PrecheckDeps = defaultDeps): Promise<PrecheckResult> {
  const { session, ...content } = input;
  const profile = session.profile;
  const base = { kind: content.kind, shadowHold: false };

  if (isStaff(profile.role)) {
    return {
      ...base,
      action: "allow",
      labels: [],
      reason: "Staff",
      sendBack: false,
      source: "staff",
      fallback: null,
      message: null,
    };
  }

  const result = await classifyContent(content, {
    client: deps.client(session),
    model: deps.model(),
    reputation: profile.reputation,
  });
  let { action, reason } = result;
  const labels: string[] = [...result.labels];
  let shadowHold = false;

  if (action === "allow" && content.kind !== "clip") {
    const flags = await deps.flags();
    if (flags.SHADOW_HOLD_NEW_USERS && isNewAccount(profile)) {
      action = "hold";
      shadowHold = true;
      labels.push(NEW_ACCOUNT_LABEL);
      reason = "New-account hold is on (spam protection).";
    }
  }

  return {
    ...base,
    action,
    labels,
    reason,
    sendBack: result.sendBack,
    source: result.source,
    fallback: result.fallback,
    shadowHold,
    message: moderationMessage(content.kind, { action, labels, sendBack: result.sendBack }),
  };
}

const KIND_NAME: Record<ModerationKind, string> = {
  thread: "a thread",
  post: "a reply",
  clip: "a clip",
  bio: "a profile",
};

const TARGET_TYPE: Record<ModerationKind, "thread" | "post" | "clip" | "profile"> = {
  thread: "thread",
  post: "post",
  clip: "clip",
  bio: "profile",
};

/** Short plain text for the audit log (the Held queue shows the full item itself). */
export function excerptOf(...parts: (string | null | undefined)[]): string {
  const text = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 300 ? `${text.slice(0, 299).trimEnd()}…` : text;
}

/**
 * Writes the AI's decision to the audit log and alerts admins on self_harm. Run it inside after():
 * the member never waits for it. `targetId` is the saved row's id, or null when nothing was saved.
 */
export async function recordPrecheck(
  result: PrecheckResult,
  target: { targetId: string | number | null; session: CompleteSession; excerpt: string },
): Promise<void> {
  if (result.source === "staff" || result.action === "allow") return;
  if (!integrations.supabaseAdmin) {
    console.warn(`[moderation] ${result.action} not logged: the Supabase secret key is missing.`);
    return;
  }
  const { session } = target;
  await logAiAction({
    action: result.shadowHold ? "shadow_hold" : result.action === "hold" ? "ai_hold" : "ai_reject",
    targetType: TARGET_TYPE[result.kind],
    targetId: target.targetId ?? (result.kind === "bio" ? session.userId : "none"),
    labels: result.labels,
    reason: result.reason,
    subjectId: session.userId,
    excerpt: target.excerpt || null,
  });
  if (result.labels.includes("self_harm")) {
    const saved = result.action === "hold" && result.kind !== "bio";
    await notifyAdmins(
      `Possible self-harm in ${KIND_NAME[result.kind]} by @${session.profile.username}. ${
        saved ? "It's in Moderation → Held." : "It wasn't saved; see Moderation → Recent actions."
      }`,
    );
  }
}
