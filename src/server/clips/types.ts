import type { ClipResolveError } from "@/lib/clips/errors";
import type { ClipOrientation } from "@/lib/clips/parse";
import type { ClipPlatform } from "@/types/content";

/** Everything we keep about a clip, taken from the platform (never from the person submitting it). */
export type ResolvedClip = {
  platform: ClipPlatform;
  /** Twitch slug, YouTube id or TikTok id: the dedupe key with `platform`. */
  externalId: string;
  /** Canonical page on the platform ("Watch on …"). */
  url: string;
  title: string;
  creatorName: string | null;
  creatorUrl: string | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  viewsOnPlatform: number | null;
  orientation: ClipOrientation;
};

export type ResolveFailure = {
  ok: false;
  code: ClipResolveError;
  platform?: ClipPlatform;
  durationSec?: number | null;
};

export type ResolveResult = { ok: true; clip: ResolvedClip } | ResolveFailure;
