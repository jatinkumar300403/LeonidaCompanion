import "server-only";
import { z } from "zod";
import type { ParsedClip } from "@/lib/clips/parse";
import { fetchJson, UpstreamError, type PlatformFetch } from "./http";
import { cleanText, safeThumbnailUrl } from "./thumbnails";
import type { ResolveResult } from "./types";

/**
 * TikTok oEmbed (SPEC §6): title, author and thumbnail; no key needed. Duration isn't available,
 * so the review queue asks the mod to check the length. Metadata only, never video.
 */
const OEMBED_URL = "https://www.tiktok.com/oembed";
const VIDEO_ID = /^\d{8,25}$/;

const oembedSchema = z.object({
  title: z.string().optional(),
  author_name: z.string().optional(),
  author_url: z.string().optional(),
  author_unique_id: z.string().optional(),
  thumbnail_url: z.string().optional(),
  html: z.string().optional(),
  embed_product_id: z.string().optional(),
});
export type TikTokOembed = z.infer<typeof oembedSchema>;

export async function fetchTikTokOembed(fetchImpl: PlatformFetch, url: string): Promise<TikTokOembed | null> {
  const { status, body } = await fetchJson(fetchImpl, `${OEMBED_URL}?${new URLSearchParams({ url }).toString()}`);
  if (status >= 400 && status < 500) return null;
  if (status !== 200) throw new UpstreamError(status, `TikTok oEmbed answered ${status}`);
  const parsed = oembedSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/** The video id: `embed_product_id`, else the embed html's data-video-id, else the link's own id. */
export function tiktokVideoId(oembed: TikTokOembed, parsed: ParsedClip): string | null {
  const fromHtml = /data-video-id="(\d{8,25})"/.exec(oembed.html ?? "")?.[1];
  const id = oembed.embed_product_id ?? fromHtml ?? parsed.id;
  return id && VIDEO_ID.test(id) ? id : null;
}

/** https://www.tiktok.com/@handle, only when the author URL really is on tiktok.com. */
function authorUrl(oembed: TikTokOembed): string | null {
  if (oembed.author_unique_id && /^[A-Za-z0-9._]{1,40}$/.test(oembed.author_unique_id)) {
    return `https://www.tiktok.com/@${oembed.author_unique_id}`;
  }
  try {
    const url = new URL(oembed.author_url ?? "");
    const handle = /^\/(@[A-Za-z0-9._]{1,40})\/?$/.exec(url.pathname)?.[1];
    return url.protocol === "https:" && url.hostname === "www.tiktok.com" && handle
      ? `https://www.tiktok.com/${handle}`
      : null;
  } catch {
    return null;
  }
}

export function checkTikTok(oembed: TikTokOembed, parsed: ParsedClip): ResolveResult {
  const id = tiktokVideoId(oembed, parsed);
  if (!id) return { ok: false, code: "not_found", platform: "tiktok" };
  const author = authorUrl(oembed);
  return {
    ok: true,
    clip: {
      platform: "tiktok",
      externalId: id,
      url: author ? `${author}/video/${id}` : `https://www.tiktok.com/embed/v2/${id}`,
      title: cleanText(oembed.title, 200) ?? "TikTok video",
      creatorName: cleanText(oembed.author_name, 100),
      creatorUrl: author,
      durationSec: null,
      thumbnailUrl: safeThumbnailUrl(oembed.thumbnail_url),
      viewsOnPlatform: null,
      orientation: "portrait",
    },
  };
}

export async function resolveTikTokClip(fetchImpl: PlatformFetch, parsed: ParsedClip): Promise<ResolveResult> {
  const oembed = await fetchTikTokOembed(fetchImpl, parsed.url);
  if (!oembed) return { ok: false, code: "not_found", platform: "tiktok" };
  return checkTikTok(oembed, parsed);
}
