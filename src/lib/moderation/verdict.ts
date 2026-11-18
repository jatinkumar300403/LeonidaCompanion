import { z } from "zod";
import {
  HOLD_LABELS,
  MODERATION_ACTIONS,
  MODERATION_LABELS,
  REJECT_LABELS,
  type ModerationAction,
  type ModerationKind,
  type ModerationLabel,
} from "@/lib/moderation/labels";

/**
 * The model's strict JSON answer (SPEC §8.2) and the rules that turn it into what happens.
 * The model's labels decide; its `action` only matters when it gives no label (D-079).
 */
export const modelVerdictSchema = z.object({
  action: z.enum(MODERATION_ACTIONS),
  labels: z.array(z.enum(MODERATION_LABELS)),
  reason: z.string(),
});

export type ModelVerdict = z.infer<typeof modelVerdictSchema>;

export type ModerationDecision = {
  action: ModerationAction;
  labels: ModerationLabel[];
  reason: string;
  /**
   * The only problem is an untagged story spoiler that the author can fix: the content isn't
   * saved and they're asked to add a spoiler tag and post again (SPEC §8.2, D-079).
   */
  sendBack: boolean;
};

/** Reputation at which a failed AI check lets content through (SPEC §8.2 fallback). */
export const FALLBACK_ALLOW_REPUTATION = 20;

const REASON_MAX = 200;

export function cleanReason(reason: string): string {
  const text = reason.replace(/\s+/g, " ").trim();
  return text.length > REASON_MAX ? `${text.slice(0, REASON_MAX - 1).trimEnd()}…` : text;
}

/**
 * SPEC §8.2 rules:
 * - any of spam, hate, sexual, doxxing → reject;
 * - any of self_harm, cheating_or_exploit, leak, harassment, untagged_spoiler → hold;
 *   an untagged spoiler on its own is sent back instead (not on clips, which stay pending anyway);
 * - untagged_spoiler is ignored when the content already sits behind a spoiler tag;
 * - otherwise allow. off_topic alone is allowed. A model hold or reject with no label at all
 *   becomes a hold, so a person looks at whatever the model couldn't name.
 */
export function decideAction(
  verdict: ModelVerdict,
  context: { kind: ModerationKind; spoilerTagged: boolean },
): ModerationDecision {
  const raw = [...new Set(verdict.labels)];
  const labels = context.spoilerTagged ? raw.filter((label) => label !== "untagged_spoiler") : raw;
  const reason = cleanReason(verdict.reason);

  if (labels.some((label) => REJECT_LABELS.has(label))) {
    return { action: "reject", labels, reason, sendBack: false };
  }
  const holds = labels.filter((label) => HOLD_LABELS.has(label));
  if (holds.length > 0) {
    if (holds.length === 1 && holds[0] === "untagged_spoiler" && context.kind !== "clip") {
      return { action: "reject", labels, reason, sendBack: true };
    }
    return { action: "hold", labels, reason, sendBack: false };
  }
  if (raw.length === 0 && verdict.action !== "allow") {
    return { action: "hold", labels, reason, sendBack: false };
  }
  return { action: "allow", labels, reason, sendBack: false };
}

export type FallbackCause = "no_key" | "timeout" | "parse" | "refusal" | "error";

const CAUSE_TEXT: Record<FallbackCause, string> = {
  no_key: "no API key",
  timeout: "timed out",
  parse: "unreadable answer",
  refusal: "model declined",
  error: "API error",
};

/** SPEC §8.2: if the moderation API fails, allow for reputation ≥ 20, hold for everyone else. */
export function fallbackDecision(reputation: number, cause: FallbackCause): ModerationDecision {
  const allow = reputation >= FALLBACK_ALLOW_REPUTATION;
  return {
    action: allow ? "allow" : "hold",
    labels: [],
    reason: `AI check unavailable (${CAUSE_TEXT[cause]}): ${
      allow ? "allowed, reputation 20 or more" : "held, reputation under 20"
    }.`,
    sendBack: false,
  };
}
