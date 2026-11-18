/**
 * AI moderation labels (SPEC §8.2) and how each one is handled. Pure and client-safe: the admin
 * queue shows the same names.
 */
export const MODERATION_LABELS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "self_harm",
  "doxxing",
  "cheating_or_exploit",
  "leak",
  "untagged_spoiler",
  "off_topic",
] as const;

export type ModerationLabel = (typeof MODERATION_LABELS)[number];

export const MODERATION_ACTIONS = ["allow", "hold", "reject"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** What the pre-check runs on (SPEC §8.2: every thread, post, clip submission and profile bio). */
export type ModerationKind = "thread" | "post" | "clip" | "bio";

/** SPEC §8.2: `reject` for clear spam, hate or sexual content, doxxing. */
export const REJECT_LABELS: ReadonlySet<ModerationLabel> = new Set(["spam", "hate", "sexual", "doxxing"]);

/** SPEC §8.2: `hold` for self_harm, cheating_or_exploit, leak, harassment, untagged_spoiler. */
export const HOLD_LABELS: ReadonlySet<ModerationLabel> = new Set([
  "self_harm",
  "cheating_or_exploit",
  "leak",
  "harassment",
  "untagged_spoiler",
]);

/** Extra label the shadow-hold flag adds (not a model label). */
export const NEW_ACCOUNT_LABEL = "new_account";

const LABEL_NAMES: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate",
  sexual: "Sexual content",
  self_harm: "Self-harm",
  doxxing: "Private info",
  cheating_or_exploit: "Cheats / exploits",
  leak: "Leak",
  untagged_spoiler: "Untagged spoiler",
  off_topic: "Off topic",
  [NEW_ACCOUNT_LABEL]: "New account",
};

export function labelName(label: string): string {
  return LABEL_NAMES[label] ?? label.replace(/_/g, " ");
}

export function isModerationLabel(value: unknown): value is ModerationLabel {
  return typeof value === "string" && (MODERATION_LABELS as readonly string[]).includes(value);
}
