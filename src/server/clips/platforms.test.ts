import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryCache } from "@/server/cache/redis";
import tiktokOembed from "./__fixtures__/tiktok-oembed.json";
import twitchClip from "./__fixtures__/twitch-clip.json";
import twitchClipsTop from "./__fixtures__/twitch-clips-top.json";
import twitchGames from "./__fixtures__/twitch-games.json";
import twitchToken from "./__fixtures__/twitch-token.json";
import twitchUsers from "./__fixtures__/twitch-users.json";
import youtubeVideo from "./__fixtures__/youtube-video.json";
import type { PlatformFetch } from "./http";

/** Platform clients and resolveClip against recorded fixtures only: no live network (SPEC §15). */

const mockEnv = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock("@/env", () => ({ env: mockEnv, integrations: {} }));
vi.mock("@/server/admin/test-auth", () => ({
  isTestIdentity: (email: string) => /^e2e-[a-z0-9-]+@example\.com$/.test(email),
}));

const { resolveClip, clipPlatformAvailability } = await import("./resolve");
const twitch = await import("./twitch");
const { devMockFetchFor, mockPlatformFetch } = await import("./dev-mock");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/** A fetch that answers from a route table and records every call. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const impl: PlatformFetch = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    const key = `${url.hostname}${url.pathname}`;
    const route = routes[key];
    if (!route) throw new Error(`unexpected request to ${key}`);
    return route(url, init);
  };
  return {
    impl,
    calls,
    count: (path: string) => calls.filter((call) => `${call.url.hostname}${call.url.pathname}` === path).length,
  };
}

const twitchRoutes = (overrides: Record<string, Route> = {}) => ({
  "id.twitch.tv/oauth2/token": () => json(twitchToken),
  "api.twitch.tv/helix/games": () => json(twitchGames),
  "api.twitch.tv/helix/clips": () => json(twitchClip),
  "api.twitch.tv/helix/users": () => json(twitchUsers),
  ...overrides,
});

function setKeys(
  keys: Partial<
    Record<"TWITCH_CLIENT_ID" | "TWITCH_CLIENT_SECRET" | "TWITCH_GTA6_GAME_ID" | "YOUTUBE_API_KEY", string>
  >,
) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  Object.assign(mockEnv, keys);
}

beforeEach(() => {
  setKeys({ TWITCH_CLIENT_ID: "cid", TWITCH_CLIENT_SECRET: "secret", YOUTUBE_API_KEY: "yt-key" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Twitch", () => {
  it("resolves a GTA VI clip with the broadcaster's channel link", async () => {
    const fetch = fakeFetch(twitchRoutes());
    const result = await resolveClip("https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage", {
      fetch: fetch.impl,
      cache: memoryCache(),
    });
    expect(result).toEqual({
      ok: true,
      clip: {
        platform: "twitch",
        externalId: "AwkwardHelplessSalamanderSwiftRage",
        url: "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
        title: "Police chase ends in the bay",
        creatorName: "ChewieMelodies",
        creatorUrl: "https://www.twitch.tv/chewiemelodies",
        durationSec: 25,
        thumbnailUrl: "https://clips-media-assets2.twitch.tv/157589949-preview-480x272.jpg",
        viewsOnPlatform: 1520,
        orientation: "landscape",
      },
    });
    const clipCall = fetch.calls.find((call) => call.url.pathname === "/helix/clips")!;
    expect(clipCall.url.searchParams.get("id")).toBe("AwkwardHelplessSalamanderSwiftRage");
    expect(new Headers(clipCall.init?.headers).get("Client-Id")).toBe("cid");
    expect(new Headers(clipCall.init?.headers).get("Authorization")).toBe("Bearer fixture-app-token");
  });

  it("accepts the channel URL shape too", async () => {
    const fetch = fakeFetch(twitchRoutes());
    const result = await resolveClip("https://www.twitch.tv/chewiemelodies/clip/AwkwardHelplessSalamanderSwiftRage", {
      fetch: fetch.impl,
      cache: memoryCache(),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects clips from another game", async () => {
    const other = { data: [{ ...twitchClip.data[0], game_id: "33214" }] };
    const fetch = fakeFetch(twitchRoutes({ "api.twitch.tv/helix/clips": () => json(other) }));
    expect(await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache: memoryCache() })).toEqual({
      ok: false,
      code: "not_gta",
      platform: "twitch",
    });
  });

  it("uses TWITCH_GTA6_GAME_ID instead of the lookup", async () => {
    setKeys({ TWITCH_CLIENT_ID: "cid", TWITCH_CLIENT_SECRET: "secret", TWITCH_GTA6_GAME_ID: "9990001" });
    const fetch = fakeFetch(twitchRoutes());
    expect((await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache: memoryCache() })).ok).toBe(
      true,
    );
    expect(fetch.count("api.twitch.tv/helix/games")).toBe(0);
  });

  it("refuses Twitch clips while Twitch has no GTA VI category", async () => {
    const fetch = fakeFetch(twitchRoutes({ "api.twitch.tv/helix/games": () => json({ data: [] }) }));
    const cache = memoryCache();
    expect(await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache })).toMatchObject({
      ok: false,
      code: "game_unknown",
    });
    await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache });
    expect(fetch.count("api.twitch.tv/helix/games")).toBe(1);
  });

  it("rejects clips over 60 seconds and unknown slugs", async () => {
    const long = { data: [{ ...twitchClip.data[0], duration: 61.2 }] };
    let fetch = fakeFetch(twitchRoutes({ "api.twitch.tv/helix/clips": () => json(long) }));
    expect(await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache: memoryCache() })).toEqual({
      ok: false,
      code: "too_long",
      platform: "twitch",
      durationSec: 61,
    });
    fetch = fakeFetch(twitchRoutes({ "api.twitch.tv/helix/clips": () => json({ data: [] }) }));
    expect(
      await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl, cache: memoryCache() }),
    ).toMatchObject({
      code: "not_found",
    });
  });

  it("caches the app token and fetches a new one once after a 401", async () => {
    let helixCalls = 0;
    const fetch = fakeFetch(
      twitchRoutes({
        "api.twitch.tv/helix/clips": () => {
          helixCalls += 1;
          return helixCalls === 2 ? json({ message: "invalid token" }, 401) : json(twitchClip);
        },
      }),
    );
    const cache = memoryCache();
    const deps = { fetch: fetch.impl, cache, clientId: "cid", clientSecret: "secret", gameIdOverride: "9990001" };
    await twitch.fetchTwitchClip(deps, "A");
    expect(fetch.count("id.twitch.tv/oauth2/token")).toBe(1);
    expect(await cache.get(twitch.TWITCH_TOKEN_KEY)).toBe("fixture-app-token");

    await twitch.fetchTwitchClip(deps, "B"); // 401, then a new token and a retry
    expect(fetch.count("id.twitch.tv/oauth2/token")).toBe(2);
    expect(helixCalls).toBe(3);
  });

  it("lists top clips in the window and maps them for the cron", async () => {
    const fetch = fakeFetch(twitchRoutes({ "api.twitch.tv/helix/clips": () => json(twitchClipsTop) }));
    const deps = { fetch: fetch.impl, cache: memoryCache(), clientId: "cid", clientSecret: "secret" };
    const since = new Date("2026-11-19T00:00:00Z");
    const until = new Date("2026-11-20T00:00:00Z");
    const clips = await twitch.fetchTopTwitchClips(deps, { gameId: "9990001", since, until, first: 50 });
    const call = fetch.calls.find((entry) => entry.url.pathname === "/helix/clips")!;
    expect(Object.fromEntries(call.url.searchParams)).toEqual({
      game_id: "9990001",
      started_at: since.toISOString(),
      ended_at: until.toISOString(),
      first: "50",
    });
    expect(clips.map((clip) => clip.id)).toEqual(["TopClipOne-AbC123", "LongClipTwo-Def456", "OddThumbThree-Ghi789"]);

    const logins = await twitch.fetchTwitchLogins(
      deps,
      clips.map((clip) => clip.broadcaster_id),
    );
    const mapped = clips.map((clip) => twitch.toResolvedTwitchClip(clip, logins.get(clip.broadcaster_id)));
    expect(mapped[1]).toMatchObject({ creatorName: "ストリーマー", creatorUrl: "https://www.twitch.tv/streamer_two" });
    expect(mapped[2]!.thumbnailUrl).toBeNull(); // host not on the allowlist
    expect(mapped[0]!.thumbnailUrl).toMatch(/^https:\/\/static-cdn\.jtvnw\.net\//);
  });

  it("isn't available without keys", async () => {
    setKeys({ YOUTUBE_API_KEY: "yt-key" });
    expect(clipPlatformAvailability()).toEqual({ youtube: true, twitch: false, tiktok: true });
    const fetch = fakeFetch({});
    expect(await resolveClip("https://clips.twitch.tv/Slug", { fetch: fetch.impl })).toEqual({
      ok: false,
      code: "not_configured",
      platform: "twitch",
    });
    expect(fetch.calls).toHaveLength(0);
  });
});

type Item = (typeof youtubeVideo.items)[number];

describe("YouTube", () => {
  const route = (mutate: (item: (typeof youtubeVideo.items)[number]) => unknown = (item) => item) => ({
    "www.googleapis.com/youtube/v3/videos": (url: URL) =>
      json({ ...youtubeVideo, items: [mutate({ ...youtubeVideo.items[0]!, id: url.searchParams.get("id")! })] }),
  });

  it("resolves a Short as a portrait clip from the API's metadata", async () => {
    const fetch = fakeFetch(route());
    const result = await resolveClip("https://youtube.com/shorts/dQw4w9WgXcQ?feature=share", { fetch: fetch.impl });
    expect(result).toEqual({
      ok: true,
      clip: {
        platform: "youtube",
        externalId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        title: "Stole a jet ski, regretted it instantly",
        creatorName: "Fixture Gaming",
        creatorUrl: "https://www.youtube.com/channel/UCfixtureChannel000000",
        durationSec: 24,
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        viewsOnPlatform: 48213,
        orientation: "portrait",
      },
    });
    const params = fetch.calls[0]!.url.searchParams;
    expect(params.get("part")).toBe("snippet,contentDetails,status,statistics");
    expect(params.get("key")).toBe("yt-key");
  });

  it.each([
    ["not embeddable", (item: Item) => ({ ...item, status: { ...item.status, embeddable: false } }), "not_embeddable"],
    ["private", (item: Item) => ({ ...item, status: { ...item.status, privacyStatus: "private" } }), "not_found"],
    ["live", (item: Item) => ({ ...item, snippet: { ...item.snippet, liveBroadcastContent: "live" } }), "live"],
    ["P0D", (item: Item) => ({ ...item, contentDetails: { duration: "P0D" } }), "live"],
    ["too long", (item: Item) => ({ ...item, contentDetails: { duration: "PT1M13S" } }), "too_long"],
  ])("rejects a %s video", async (_label, mutate, code) => {
    const fetch = fakeFetch(route(mutate));
    expect(await resolveClip("https://youtu.be/dQw4w9WgXcQ", { fetch: fetch.impl })).toMatchObject({ ok: false, code });
  });

  it("reports missing videos, quota errors and timeouts", async () => {
    let fetch = fakeFetch({ "www.googleapis.com/youtube/v3/videos": () => json({ ...youtubeVideo, items: [] }) });
    expect(await resolveClip("https://youtu.be/dQw4w9WgXcQ", { fetch: fetch.impl })).toMatchObject({
      code: "not_found",
    });

    fetch = fakeFetch({ "www.googleapis.com/youtube/v3/videos": () => json({ error: { code: 403 } }, 403) });
    expect(await resolveClip("https://youtu.be/dQw4w9WgXcQ", { fetch: fetch.impl })).toEqual({
      ok: false,
      code: "upstream",
      platform: "youtube",
    });

    fetch = fakeFetch({
      "www.googleapis.com/youtube/v3/videos": () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    });
    expect(await resolveClip("https://youtu.be/dQw4w9WgXcQ", { fetch: fetch.impl })).toMatchObject({
      code: "upstream",
    });
  });

  it("isn't available without a key", async () => {
    setKeys({});
    expect(await resolveClip("https://youtu.be/dQw4w9WgXcQ", { fetch: fakeFetch({}).impl })).toEqual({
      ok: false,
      code: "not_configured",
      platform: "youtube",
    });
  });
});

describe("TikTok", () => {
  it("resolves through oEmbed without a key", async () => {
    setKeys({});
    const fetch = fakeFetch({ "www.tiktok.com/oembed": () => json(tiktokOembed) });
    const result = await resolveClip("https://www.tiktok.com/@scout2015/video/6718335390845095173?lang=en", {
      fetch: fetch.impl,
    });
    expect(result).toEqual({
      ok: true,
      clip: {
        platform: "tiktok",
        externalId: "6718335390845095173",
        url: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
        title: "Scramble up ur name & I’ll try to guess it #foryoupage",
        creatorName: "Scout & Suki",
        creatorUrl: "https://www.tiktok.com/@scout2015",
        durationSec: null,
        thumbnailUrl: "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/fixture-thumbnail",
        viewsOnPlatform: null,
        orientation: "portrait",
      },
    });
    expect(fetch.calls[0]!.url.searchParams.get("url")).toBe(
      "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    );
  });

  it("resolves short links from the embed html when there's no embed_product_id", async () => {
    const older: Partial<typeof tiktokOembed> = { ...tiktokOembed };
    delete older.embed_product_id;
    delete older.author_unique_id;
    const fetch = fakeFetch({ "www.tiktok.com/oembed": () => json(older) });
    const result = await resolveClip("https://vm.tiktok.com/ZMabc123/", { fetch: fetch.impl });
    expect(result).toMatchObject({
      ok: true,
      clip: { externalId: "6718335390845095173", creatorUrl: "https://www.tiktok.com/@scout2015" },
    });
  });

  it("reports removed videos", async () => {
    const fetch = fakeFetch({
      "www.tiktok.com/oembed": () => json({ code: 400, message: "Something went wrong" }, 400),
    });
    expect(await resolveClip("https://www.tiktok.com/@a/video/123456789012", { fetch: fetch.impl })).toEqual({
      ok: false,
      code: "not_found",
      platform: "tiktok",
    });
  });
});

describe("parsing errors and the dev mock", () => {
  it("returns the parse error without calling anything", async () => {
    const fetch = fakeFetch({});
    expect(await resolveClip("https://vimeo.com/1", { fetch: fetch.impl })).toEqual({
      ok: false,
      code: "unsupported_site",
    });
    expect(fetch.calls).toHaveLength(0);
  });

  it("answers e2e identities in development from the fixtures, without keys", async () => {
    setKeys({});
    vi.stubEnv("NODE_ENV", "development");
    try {
      expect(devMockFetchFor("e2e-member-1234abcd@example.com")).toBe(mockPlatformFetch);
      expect(devMockFetchFor("someone@example.com")).toBeNull();
      const result = await resolveClip("https://www.youtube.com/shorts/e2eAbc12345", {
        fetch: mockPlatformFetch,
        mock: true,
      });
      expect(result).toMatchObject({
        ok: true,
        clip: { externalId: "e2eAbc12345", title: "[E2E] Mocked YouTube clip e2eAbc12345", orientation: "portrait" },
      });
      const twitchResult = await resolveClip("https://clips.twitch.tv/E2eSlug-123", {
        fetch: mockPlatformFetch,
        mock: true,
      });
      expect(twitchResult).toMatchObject({ ok: true, clip: { externalId: "E2eSlug-123" } });
    } finally {
      vi.unstubAllEnvs();
    }
    expect(devMockFetchFor("e2e-member-1234abcd@example.com")).toBeNull();
  });
});
