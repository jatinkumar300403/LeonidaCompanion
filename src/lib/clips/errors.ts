import { CLIP_MAX_SECONDS } from "@/config/clips";
import { PLATFORM_LABELS } from "@/lib/clips/embed";
import { formatDuration } from "@/lib/format";
import type { ClipParseError } from "@/lib/clips/parse";
import type { ClipPlatform } from "@/types/content";

/** Why a clip link can't be added (resolveClip, SPEC §6), and the plain-English message for each. */
export type ClipResolveError =
  | ClipParseError
  | "not_found"
  | "not_gta"
  | "game_unknown"
  | "not_embeddable"
  | "too_long"
  | "live"
  | "not_configured"
  | "upstream";

export type ClipErrorContext = { platform?: ClipPlatform; durationSec?: number | null };

export function clipErrorMessage(code: ClipResolveError, context: ClipErrorContext = {}): string {
  const platform = context.platform ? PLATFORM_LABELS[context.platform] : "The platform";
  switch (code) {
    case "empty":
      return "Paste a clip link first.";
    case "invalid_url":
      return "That isn't a valid link. Copy the clip's address and paste it here.";
    case "unsupported_site":
      return "We take clips from Twitch, YouTube and TikTok only.";
    case "not_a_clip":
      return "That link doesn't point to a single clip or video. Open the clip itself and copy its link.";
    case "not_found":
      return `We couldn't find that clip on ${platform}. Check that it's public and the link is complete.`;
    case "not_gta":
      return "That Twitch clip isn't from GTA VI. Only GTA VI clips can be added.";
    case "game_unknown":
      return "We can't check Twitch clips right now. Try a YouTube or TikTok link, or try again later.";
    case "not_embeddable":
      return "The creator turned off embedding for this video, so we can't show it here.";
    case "too_long":
      return context.durationSec
        ? `Clips can be up to ${formatDuration(CLIP_MAX_SECONDS)} long. This one is ${formatDuration(context.durationSec)}.`
        : `Clips can be up to ${CLIP_MAX_SECONDS} seconds long.`;
    case "live":
      return "Live streams, premieres and upcoming videos can't be added. Share a finished clip.";
    case "not_configured":
      return `${platform} links can't be checked yet, so they're not open for submissions. Please check back soon.`;
    case "upstream":
      return `${platform} didn't answer. Please try again in a minute.`;
  }
}
