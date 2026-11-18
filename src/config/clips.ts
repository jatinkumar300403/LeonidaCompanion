/**
 * Clip settings (SPEC §6, D-070 to D-077). Plain data with no imports, so next.config.ts can read
 * the thumbnail hosts and frame hosts from here too.
 */

/** SPEC §6: target 15–25 s, accept up to 60 s. */
export const CLIP_MAX_SECONDS = 60;

/** Caption limit shown in the form (SPEC §6). The database allows up to 280 for mod edits. */
export const CLIP_CAPTION_MAX = 140;

export const CLIP_PAGE_SIZE = 12;
export const CLIP_MAX_PAGE = 50;
export const CLIP_QUEUE_PAGE_SIZE = 40;
export const CLIP_WEEKLY_SIZE = 10;

/** The exact Twitch category name used to look up GTA VI's game id (override: TWITCH_GTA6_GAME_ID). */
export const TWITCH_GTA6_GAME_NAME = "Grand Theft Auto VI";

/**
 * Thumbnail CDNs. A thumbnail URL is stored only when its host matches one of these (anything else
 * shows the original placeholder art), and next.config.ts allows exactly these in next/image.
 * A leading "**." matches any subdomain, as in next/image remotePatterns.
 */
export const CLIP_THUMBNAIL_HOSTS = [
  "i.ytimg.com",
  "clips-media-assets2.twitch.tv",
  "static-cdn.jtvnw.net",
  "**.tiktokcdn.com",
  "**.tiktokcdn-us.com",
] as const;

/** Iframe hosts for the CSP frame-src (official embeds + Turnstile). */
export const EMBED_FRAME_HOSTS = [
  "https://clips.twitch.tv",
  "https://player.twitch.tv",
  "https://www.youtube-nocookie.com",
  "https://www.tiktok.com",
  "https://challenges.cloudflare.com",
] as const;

/** TikTok's official embed script, loaded only after a visitor presses play. */
export const TIKTOK_EMBED_SCRIPT = "https://www.tiktok.com/embed.js";

/** One-tap reasons in the review queue; the mod can also type their own. */
export const CLIP_REJECT_REASONS = [
  "Not GTA VI",
  "Story spoiler or cutscene",
  "Duplicate",
  "Longer than 60 seconds",
  "Cheats, exploits or leaks",
  "Low quality or no highlight",
  "Breaks the community guidelines",
] as const;

export const CLIP_REMOVE_REASONS = ["Creator asked for removal", "Breaks the community guidelines"] as const;

/** True when a hostname matches one of the patterns above ("**.x.com" matches any subdomain of x.com). */
export function isAllowedThumbnailHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return CLIP_THUMBNAIL_HOSTS.some((pattern) =>
    pattern.startsWith("**.") ? host.endsWith(pattern.slice(2)) : host === pattern,
  );
}
