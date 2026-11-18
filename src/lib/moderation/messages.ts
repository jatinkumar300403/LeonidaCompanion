import type { ModerationAction, ModerationKind } from "@/lib/moderation/labels";

/**
 * What a member reads after the pre-check (SPEC §8.2). Friendly, says what happened and what to
 * do next. `null` means nothing to say (allowed).
 */
export type MessageInput = {
  action: ModerationAction;
  labels: readonly string[];
  sendBack: boolean;
};

const WHAT: Record<ModerationKind, string> = {
  thread: "thread",
  post: "reply",
  clip: "clip",
  bio: "profile",
};

const SPOILER_FIX: Record<ModerationKind, string> = {
  thread:
    "This looks like it gives away part of the story. Tick “Contains spoilers” or wrap the spoiler in ||double bars||, then post again.",
  post: "This looks like it gives away part of the story. Wrap the spoiler in ||double bars||, then post again.",
  clip: "This looks like a story spoiler. Story spoilers and cutscenes can't be shared as clips.",
  bio: "Your bio looks like it gives away part of the story. Wrap the spoiler in ||double bars||, then save again.",
};

/** Shown with a self-harm hold: kind, and pointing to real help. */
export const SUPPORT_LINE =
  "If you're going through something hard right now, you don't have to deal with it alone. Please reach out to someone you trust, or to your local emergency number.";

function rejectReason(labels: readonly string[]): string {
  if (labels.includes("doxxing")) return "it seems to share someone's private information";
  if (labels.includes("hate")) return "it looks like hate speech";
  if (labels.includes("sexual")) return "it looks like sexual content";
  if (labels.includes("spam")) return "it looks like spam";
  return "it seems to break the community guidelines";
}

export function moderationMessage(kind: ModerationKind, result: MessageInput): string | null {
  const what = WHAT[kind];
  if (result.action === "allow") return null;

  if (result.action === "reject") {
    if (result.sendBack) return SPOILER_FIX[kind];
    const verb = kind === "bio" ? "saved" : kind === "clip" ? "submitted" : "posted";
    return `Your ${what} wasn't ${verb} because ${rejectReason(result.labels)}. If we got this wrong, change the wording and try again.`;
  }

  // Hold.
  const selfHarm = result.labels.includes("self_harm");
  let text: string;
  switch (kind) {
    case "thread":
      text = "Thanks! Your thread is waiting for a moderator and goes public once it's approved.";
      break;
    case "post":
      text = "Thanks! Your reply is waiting for a moderator and shows once it's approved.";
      break;
    case "clip":
      text = "Thanks! Your clip is waiting for a moderator.";
      break;
    case "bio":
      text = "Your profile needs a moderator's check, so it wasn't saved. Try different wording.";
      break;
  }
  return selfHarm ? `${text} ${SUPPORT_LINE}` : text;
}
