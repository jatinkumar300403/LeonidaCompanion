import type { ClipPlatform } from "@/types/content";

/**
 * Clip link parsing (SPEC §6). Pure and client-safe: the submit form uses it to react as soon as
 * a link looks right, and resolveClip() uses it before calling any platform API. Hostnames are
 * matched exactly, so look-alikes such as youtube.com.example.net are refused.
 */

export type ClipOrientation = "landscape" | "portrait";

export type ParsedClip = {
  platform: ClipPlatform;
  /** Twitch clip slug, YouTube video id or TikTok video id. Null for TikTok short links (oEmbed resolves them). */
  id: string | null;
  /** URL to look the clip up with: canonical for Twitch and YouTube, the cleaned link for TikTok. */
  url: string;
  orientation: ClipOrientation;
};

export type ClipParseError = "empty" | "invalid_url" | "unsupported_site" | "not_a_clip";

export type ClipParseResult = { ok: true; clip: ParsedClip } | { ok: false; error: ClipParseError };

export const CLIP_URL_MAX = 500;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TWITCH_SLUG = /^[A-Za-z0-9_-]{1,120}$/;
const TIKTOK_ID = /^\d{8,25}$/;
const TIKTOK_SHORT_CODE = /^[A-Za-z0-9_-]{4,40}$/;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const YOUTUBE_EMBED_HOSTS = new Set(["youtube-nocookie.com", "www.youtube-nocookie.com"]);
const TWITCH_HOSTS = new Set(["twitch.tv", "www.twitch.tv", "m.twitch.tv"]);
const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);
const TIKTOK_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);

function toUrl(input: string): URL | null {
  const trimmed = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function youtube(id: string | null | undefined, shorts = false): ClipParseResult {
  if (!id || !YOUTUBE_ID.test(id)) return { ok: false, error: "not_a_clip" };
  return {
    ok: true,
    clip: {
      platform: "youtube",
      id,
      url: shorts ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      orientation: shorts ? "portrait" : "landscape",
    },
  };
}

function twitch(slug: string | null | undefined): ClipParseResult {
  if (!slug || !TWITCH_SLUG.test(slug)) return { ok: false, error: "not_a_clip" };
  return {
    ok: true,
    clip: { platform: "twitch", id: slug, url: `https://clips.twitch.tv/${slug}`, orientation: "landscape" },
  };
}

function tiktok(id: string | null, url: string): ClipParseResult {
  return { ok: true, clip: { platform: "tiktok", id, url, orientation: "portrait" } };
}

function parseYouTube(url: URL, host: string): ClipParseResult {
  const parts = segments(url);
  if (host === "youtu.be") return youtube(parts[0]);
  if (YOUTUBE_EMBED_HOSTS.has(host))
    return parts[0] === "embed" ? youtube(parts[1]) : { ok: false, error: "not_a_clip" };
  switch (parts[0]) {
    case "watch":
      return youtube(url.searchParams.get("v"));
    case "shorts":
      return youtube(parts[1], true);
    case "embed":
    case "live":
    case "v":
      return youtube(parts[1]);
    default:
      return { ok: false, error: "not_a_clip" };
  }
}

function parseTwitch(url: URL, host: string): ClipParseResult {
  const parts = segments(url);
  if (host === "clips.twitch.tv") {
    if (parts[0] === "embed") return twitch(url.searchParams.get("clip"));
    return parts.length === 1 ? twitch(parts[0]) : { ok: false, error: "not_a_clip" };
  }
  // twitch.tv/<channel>/clip/<slug> and m.twitch.tv/clip/<slug>
  if (parts.length === 3 && parts[1] === "clip") return twitch(parts[2]);
  if (parts.length === 2 && parts[0] === "clip") return twitch(parts[1]);
  return { ok: false, error: "not_a_clip" };
}

function parseTikTok(url: URL, host: string): ClipParseResult {
  const parts = segments(url);
  if (TIKTOK_SHORT_HOSTS.has(host)) {
    return parts.length === 1 && TIKTOK_SHORT_CODE.test(parts[0]!)
      ? tiktok(null, `https://${host}/${parts[0]}/`)
      : { ok: false, error: "not_a_clip" };
  }
  // tiktok.com/t/<code>
  if (parts.length === 2 && parts[0] === "t" && TIKTOK_SHORT_CODE.test(parts[1]!)) {
    return tiktok(null, `https://www.tiktok.com/t/${parts[1]}/`);
  }
  // tiktok.com/@user/video/<id>
  if (parts.length === 3 && parts[0]!.startsWith("@") && parts[1] === "video" && TIKTOK_ID.test(parts[2]!)) {
    return tiktok(parts[2]!, `https://www.tiktok.com/${parts[0]}/video/${parts[2]}`);
  }
  // m.tiktok.com/v/<id>.html, tiktok.com/embed/v2/<id>, tiktok.com/player/v1/<id>
  const last = parts.at(-1)?.replace(/\.html$/, "") ?? "";
  const known =
    (parts.length === 2 && parts[0] === "v") ||
    (parts.length === 3 && parts[0] === "embed" && parts[1] === "v2") ||
    (parts.length === 2 && parts[0] === "embed") ||
    (parts.length === 3 && parts[0] === "player" && parts[1] === "v1");
  if (known && TIKTOK_ID.test(last)) return tiktok(last, `https://www.tiktok.com/embed/v2/${last}`);
  return { ok: false, error: "not_a_clip" };
}

/** Parses a pasted clip link. Never throws. */
export function parseClipUrl(input: string): ClipParseResult {
  if (!input || !input.trim()) return { ok: false, error: "empty" };
  if (input.length > CLIP_URL_MAX) return { ok: false, error: "invalid_url" };
  const url = toUrl(input);
  if (!url) return { ok: false, error: "invalid_url" };
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be" || YOUTUBE_HOSTS.has(host) || YOUTUBE_EMBED_HOSTS.has(host)) return parseYouTube(url, host);
  if (host === "clips.twitch.tv" || TWITCH_HOSTS.has(host)) return parseTwitch(url, host);
  if (TIKTOK_HOSTS.has(host) || TIKTOK_SHORT_HOSTS.has(host)) return parseTikTok(url, host);
  return { ok: false, error: "unsupported_site" };
}

/** Portrait for TikTok and YouTube Shorts, landscape otherwise (D-071: derived, not stored). */
export function clipOrientation(platform: ClipPlatform, url: string): ClipOrientation {
  if (platform === "tiktok") return "portrait";
  if (platform === "youtube" && /^https:\/\/(www\.)?youtube\.com\/shorts\//.test(url)) return "portrait";
  return "landscape";
}
