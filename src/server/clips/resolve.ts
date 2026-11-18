import "server-only";
import { env } from "@/env";
import { parseClipUrl } from "@/lib/clips/parse";
import { sharedCache, memoryCache, type JsonCache } from "@/server/cache/redis";
import { UpstreamError, type PlatformFetch } from "./http";
import { resolveTikTokClip } from "./tiktok";
import { resolveTwitchClip, type TwitchDeps } from "./twitch";
import { resolveYouTubeClip } from "./youtube";
import type { ResolveResult } from "./types";
import type { ClipPlatform } from "@/types/content";

export { parseClipUrl } from "@/lib/clips/parse";
export type { ResolvedClip, ResolveResult } from "./types";

/**
 * resolveClip(url) (SPEC §6): parse the link, then ask the platform for the clip's metadata and
 * check it: GTA VI on Twitch, embeddable on YouTube, ≤ 60 s, not live. Every field we store comes
 * from the platform. Never throws: platform trouble comes back as `upstream`.
 */

export type ResolveOptions = {
  /** Injected fetch (tests, the dev E2E mock). Defaults to the global fetch. */
  fetch?: PlatformFetch;
  cache?: JsonCache;
  /** Dev E2E mock: platform keys aren't needed because nothing leaves the machine. */
  mock?: boolean;
};

/** Which platforms can be checked right now (TikTok oEmbed needs no key). */
export function clipPlatformAvailability(): Record<ClipPlatform, boolean> {
  return {
    youtube: Boolean(env.YOUTUBE_API_KEY),
    twitch: Boolean(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET),
    tiktok: true,
  };
}

/** Twitch dependencies from the environment, or null when the keys are missing. */
export function twitchDepsFromEnv(options: Pick<ResolveOptions, "fetch" | "cache" | "mock"> = {}): TwitchDeps | null {
  if (options.mock) {
    return {
      fetch: options.fetch ?? fetch,
      cache: options.cache ?? memoryCache(),
      clientId: "mock",
      clientSecret: "mock",
      // The fixtures carry their own placeholder game id; a real override would fail them.
      gameIdOverride: null,
    };
  }
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return null;
  return {
    fetch: options.fetch ?? fetch,
    cache: options.cache ?? sharedCache(),
    clientId: env.TWITCH_CLIENT_ID,
    clientSecret: env.TWITCH_CLIENT_SECRET,
    gameIdOverride: env.TWITCH_GTA6_GAME_ID ?? null,
  };
}

export async function resolveClip(input: string, options: ResolveOptions = {}): Promise<ResolveResult> {
  const parsed = parseClipUrl(input);
  if (!parsed.ok) return { ok: false, code: parsed.error };
  const { clip } = parsed;
  const fetchImpl = options.fetch ?? fetch;

  try {
    switch (clip.platform) {
      case "youtube": {
        const apiKey = options.mock ? "mock" : env.YOUTUBE_API_KEY;
        if (!apiKey) return { ok: false, code: "not_configured", platform: "youtube" };
        return await resolveYouTubeClip({ fetch: fetchImpl, apiKey }, clip);
      }
      case "twitch": {
        const deps = twitchDepsFromEnv(options);
        if (!deps) return { ok: false, code: "not_configured", platform: "twitch" };
        return await resolveTwitchClip(deps, clip.id!);
      }
      case "tiktok":
        return await resolveTikTokClip(fetchImpl, clip);
    }
  } catch (error) {
    if (!(error instanceof UpstreamError)) console.error(`[clips] resolving a ${clip.platform} link failed`, error);
    else console.warn(`[clips] ${error.message}`);
    return { ok: false, code: "upstream", platform: clip.platform };
  }
}
