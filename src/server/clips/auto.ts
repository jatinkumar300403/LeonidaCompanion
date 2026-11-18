import "server-only";
import { CLIP_MAX_SECONDS } from "@/config/clips";
import {
  fetchTopTwitchClips,
  fetchTwitchLogins,
  getGta6GameId,
  toResolvedTwitchClip,
  type TwitchClip,
  type TwitchDeps,
} from "./twitch";
import type { ResolvedClip } from "./types";

/**
 * Hourly auto-candidates (SPEC §6): the 50 most-viewed GTA VI Twitch clips of the last 24 hours.
 * They go in as `pending` for the owner to approve; nothing is auto-published.
 */
export const AUTO_WINDOW_MS = 24 * 3_600_000;
export const AUTO_FIRST = 50;

/** GTA VI only (Helix already filters by game; this guards against a changed response) and ≤ 60 s. */
export function selectAutoCandidates(clips: readonly TwitchClip[], gameId: string): TwitchClip[] {
  const seen = new Set<string>();
  return clips.filter((clip) => {
    if (clip.game_id !== gameId || Math.round(clip.duration) > CLIP_MAX_SECONDS || seen.has(clip.id)) return false;
    seen.add(clip.id);
    return true;
  });
}

export type AutoCandidates = { gameId: string | null; fetched: number; candidates: ResolvedClip[] };

export async function fetchTwitchCandidates(deps: TwitchDeps, now: Date = new Date()): Promise<AutoCandidates> {
  const gameId = await getGta6GameId(deps);
  if (!gameId) return { gameId: null, fetched: 0, candidates: [] };
  const clips = await fetchTopTwitchClips(deps, {
    gameId,
    since: new Date(now.getTime() - AUTO_WINDOW_MS),
    until: now,
    first: AUTO_FIRST,
  });
  const picked = selectAutoCandidates(clips, gameId);
  const logins = await fetchTwitchLogins(
    deps,
    picked.map((clip) => clip.broadcaster_id),
  ).catch(() => new Map<string, string>());
  return {
    gameId,
    fetched: clips.length,
    candidates: picked.map((clip) => toResolvedTwitchClip(clip, logins.get(clip.broadcaster_id))),
  };
}
