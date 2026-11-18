import "server-only";
import { isTestIdentity } from "@/server/admin/test-auth";
import tiktokOembed from "./__fixtures__/tiktok-oembed.json";
import twitchClip from "./__fixtures__/twitch-clip.json";
import twitchGames from "./__fixtures__/twitch-games.json";
import twitchToken from "./__fixtures__/twitch-token.json";
import twitchUsers from "./__fixtures__/twitch-users.json";
import youtubeVideo from "./__fixtures__/youtube-video.json";
import type { PlatformFetch } from "./http";

/**
 * Dev-only fake platform APIs for Playwright (E2E #4, D-073), following D-044's test mailbox:
 * under `next dev`, clip lookups made for `e2e-…@example.com` users are answered from the
 * recorded fixtures instead of the network, so no keys are needed and no platform is called.
 * In production builds NODE_ENV is "production" and this always returns null.
 */
export function devMockFetchFor(email: string | null | undefined): PlatformFetch | null {
  if (process.env.NODE_ENV !== "development" || !email || !isTestIdentity(email)) return null;
  return mockPlatformFetch;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const MOCK_TITLE = "[E2E] Mocked";

export const mockPlatformFetch: PlatformFetch = async (input) => {
  const url = new URL(input);

  if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/videos") {
    const id = url.searchParams.get("id") ?? "";
    const [item] = youtubeVideo.items;
    return json({
      ...youtubeVideo,
      items: [
        {
          ...item,
          id,
          snippet: {
            ...item!.snippet,
            title: `${MOCK_TITLE} YouTube clip ${id}`,
            thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 480, height: 360 } },
          },
        },
      ],
    });
  }

  if (url.hostname === "id.twitch.tv") return json(twitchToken);
  if (url.hostname === "api.twitch.tv" && url.pathname === "/helix/games") return json(twitchGames);
  if (url.hostname === "api.twitch.tv" && url.pathname === "/helix/users") return json(twitchUsers);
  if (url.hostname === "api.twitch.tv" && url.pathname === "/helix/clips") {
    const id = url.searchParams.get("id") ?? "";
    const [clip] = twitchClip.data;
    return json({
      data: [{ ...clip, id, url: `https://clips.twitch.tv/${id}`, title: `${MOCK_TITLE} Twitch clip ${id}` }],
      pagination: {},
    });
  }

  if (url.hostname === "www.tiktok.com" && url.pathname === "/oembed") {
    const id = /(\d{8,25})/.exec(url.searchParams.get("url") ?? "")?.[1] ?? tiktokOembed.embed_product_id;
    return json({ ...tiktokOembed, embed_product_id: id, title: `${MOCK_TITLE} TikTok clip ${id}` });
  }

  return json({ error: "not mocked" }, 404);
};
