import "server-only";
import { z } from "zod";
import { CLIP_MAX_SECONDS } from "@/config/clips";
import { parseIsoDuration } from "@/lib/clips/duration";
import type { ParsedClip } from "@/lib/clips/parse";
import { fetchJson, UpstreamError, type PlatformFetch } from "./http";
import { cleanText, safeThumbnailUrl } from "./thumbnails";
import type { ResolveResult } from "./types";

/**
 * YouTube Data API v3 `videos.list` (SPEC §6): title, channel, duration, thumbnail and
 * `status.embeddable`. One quota unit per lookup. Metadata only, never video.
 */
export type YouTubeDeps = { fetch: PlatformFetch; apiKey: string };

const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

const thumb = z.object({ url: z.string() }).optional();
const videoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    channelId: z.string(),
    channelTitle: z.string().optional(),
    liveBroadcastContent: z.string().optional(),
    thumbnails: z
      .object({ maxres: thumb, standard: thumb, high: thumb, medium: thumb, default: thumb })
      .partial()
      .optional(),
  }),
  contentDetails: z.object({ duration: z.string().optional() }).optional(),
  status: z.object({ embeddable: z.boolean().optional(), privacyStatus: z.string().optional() }).optional(),
  statistics: z.object({ viewCount: z.string().optional() }).optional(),
});
export type YouTubeVideo = z.infer<typeof videoSchema>;

export async function fetchYouTubeVideo(deps: YouTubeDeps, id: string): Promise<YouTubeVideo | null> {
  const params = new URLSearchParams({ part: "snippet,contentDetails,status,statistics", id, key: deps.apiKey });
  const { status, body } = await fetchJson(deps.fetch, `${VIDEOS_URL}?${params.toString()}`);
  if (status === 400 || status === 404) return null;
  // 403 = bad key or quota exhausted: the platform can't answer right now.
  if (status !== 200) throw new UpstreamError(status, `YouTube videos.list answered ${status}`);
  const list = z.object({ items: z.array(z.unknown()).optional() }).safeParse(body);
  if (!list.success) throw new UpstreamError(200, "YouTube sent an unexpected video list");
  const video = videoSchema.safeParse(list.data.items?.[0]);
  return video.success && video.data.id === id ? video.data : null;
}

export function checkYouTubeVideo(video: YouTubeVideo, parsed: ParsedClip): ResolveResult {
  const live = video.snippet.liveBroadcastContent;
  if (live === "live" || live === "upcoming") return { ok: false, code: "live", platform: "youtube" };
  if (video.status?.privacyStatus === "private") return { ok: false, code: "not_found", platform: "youtube" };
  if (video.status?.embeddable === false) return { ok: false, code: "not_embeddable", platform: "youtube" };

  const durationSec = parseIsoDuration(video.contentDetails?.duration);
  // P0D is what a finished live stream or an unprocessed upload reports.
  if (durationSec === null || durationSec === 0) return { ok: false, code: "live", platform: "youtube" };
  if (durationSec > CLIP_MAX_SECONDS) return { ok: false, code: "too_long", platform: "youtube", durationSec };

  const thumbs = video.snippet.thumbnails ?? {};
  const views = Number(video.statistics?.viewCount);
  return {
    ok: true,
    clip: {
      platform: "youtube",
      externalId: video.id,
      url: parsed.url,
      title: cleanText(video.snippet.title, 200) ?? "YouTube video",
      creatorName: cleanText(video.snippet.channelTitle, 100),
      creatorUrl: `https://www.youtube.com/channel/${encodeURIComponent(video.snippet.channelId)}`,
      durationSec,
      thumbnailUrl: safeThumbnailUrl((thumbs.high ?? thumbs.medium ?? thumbs.standard ?? thumbs.default)?.url),
      viewsOnPlatform: Number.isSafeInteger(views) ? views : null,
      orientation: parsed.orientation,
    },
  };
}

export async function resolveYouTubeClip(deps: YouTubeDeps, parsed: ParsedClip): Promise<ResolveResult> {
  const video = await fetchYouTubeVideo(deps, parsed.id!);
  if (!video) return { ok: false, code: "not_found", platform: "youtube" };
  return checkYouTubeVideo(video, parsed);
}
