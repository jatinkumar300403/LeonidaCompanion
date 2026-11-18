import type { ClipPlatform } from "@/types/content";

/**
 * Official embed URLs only (CLAUDE.md rule 1): video is never downloaded, re-hosted or proxied.
 * Builds the iframe `src` for the click-to-load facade and the `embedUrl` for VideoObject JSON-LD.
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

/**
 * Hosts to pass from the server: the configured site hosts plus the Vercel deployment host
 * (VERCEL_URL, set by Vercel on every deploy), so Preview deploys play Twitch clips too.
 */
export function serverParentHosts(configured: readonly string[], vercelUrl = process.env.VERCEL_URL): string[] {
  return vercelUrl ? [...configured, vercelUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")] : [...configured];
}

/** iframe src for the platform, or null when the platform needs its own script (TikTok's embed.js). */
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

/** The page TikTok's embed.js turns into its player (also the VideoObject embedUrl). */
export function tiktokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${encodeURIComponent(videoId)}`;
}

/**
 * `embedUrl` for VideoObject JSON-LD (SPEC §13): the platform's own player, without autoplay.
 * Twitch gets the site's host as `parent`.
 */
export function publicEmbedUrl(platform: ClipPlatform, embedId: string, siteHost: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embedId)}`;
    case "twitch":
      return `https://clips.twitch.tv/embed?${new URLSearchParams({ clip: embedId, parent: siteHost }).toString()}`;
    case "tiktok":
      return tiktokEmbedUrl(embedId);
  }
}
