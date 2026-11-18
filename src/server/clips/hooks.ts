import "server-only";
import type { ResolvedClip } from "@/server/clips/types";

/**
 * Phase 6 hook: the AI pre-check of a member's clip (SPEC §6 step 3, §8.2: title + caption).
 * Until Phase 6 fills it, everything is allowed; every submission is pending for a mod anyway.
 * Per D-016 a "hold" keeps the clip pending with its labels logged, and a "reject" refuses it.
 */
export type ClipPrecheck =
  { action: "allow" } | { action: "hold"; labels: string[] } | { action: "reject"; message: string };

export async function precheckClip(input: {
  clip: ResolvedClip;
  caption: string | null;
  userId: string;
  reputation: number;
}): Promise<ClipPrecheck> {
  void input;
  return { action: "allow" };
}
