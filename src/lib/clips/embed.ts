import type { ClipPlatform } from "@/types/content";

/**
 * Official embed URLs only (CLAUDE.md rule 1): video is never downloaded, re-hosted or proxied.
 * Phase 5 adds URL parsing and metadata; this builds the iframe `src` for the click-to-load facade.
 */

export const PLATFORM_LABELS: Record<ClipPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
};

/**
 * Twitch refuses to play unless every host the page runs on is passed as `parent`
 * (SPEC §6: NEXT_PUBLIC_SITE_HOSTS + localhost + the current host, e.g. a Vercel preview).
 */
export function twitchParentHosts(configured: readonly string[], currentHost?: string): string[] {
  const hosts = [...configured, "localhost", currentHost ?? ""]
    .map((host) => host.trim().toLowerCase().replace(/:\d+$/, ""))
    .filter(Boolean);
  return [...new Set(hosts)];
}

/** iframe src for the platform, or null when the platform needs its own script (TikTok, Phase 5). */
export function buildEmbedSrc(
  platform: ClipPlatform,
  embedId: string,
  parentHosts: readonly string[] = [],
): string | null {
  const id = encodeURIComponent(embedId);
  switch (platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;
    case "twitch": {
      const params = new URLSearchParams({ clip: embedId, autoplay: "true" });
      for (const host of parentHosts) params.append("parent", host);
      return `https://clips.twitch.tv/embed?${params.toString()}`;
    }
    case "tiktok":
      return null;
  }
}
