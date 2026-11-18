import "server-only";
import type { CompleteSession } from "@/server/auth/session";
import type { ResolvedClip } from "@/server/clips/types";
import { precheckContent, type PrecheckResult } from "@/server/moderation/precheck";

/**
 * The AI pre-check of a member's clip (SPEC §6 step 3, §8.2): the platform title and the caption.
 * Per D-016 a "hold" keeps the clip pending (every submission waits for a mod anyway) with its
 * labels logged after the insert, and a "reject" refuses it with a friendly message.
 */
export async function precheckClip(input: {
  clip: ResolvedClip;
  caption: string | null;
  session: CompleteSession;
}): Promise<PrecheckResult> {
  return precheckContent({
    kind: "clip",
    title: input.clip.title,
    body: input.caption ?? "(no caption)",
    // A caption can hide a spoiler in ||bars||; the clip itself can't be tagged.
    spoilerTagged: false,
    context: `${input.clip.platform} clip by ${input.clip.creatorName}`,
    session: input.session,
  });
}
