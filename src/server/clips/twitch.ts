import "server-only";
import { z } from "zod";
import { CLIP_MAX_SECONDS, TWITCH_GTA6_GAME_NAME } from "@/config/clips";
import type { JsonCache } from "@/server/cache/redis";
import { fetchJson, UpstreamError, type PlatformFetch } from "./http";
import { cleanText, safeThumbnailUrl } from "./thumbnails";
import type { ResolvedClip, ResolveResult } from "./types";

/**
 * Twitch Helix (SPEC §6): clip metadata with an app access token (client credentials), GTA VI's
 * game id, and the top clips for the hourly auto-candidates cron. Metadata only, never video.
 */

export type TwitchDeps = {
  fetch: PlatformFetch;
  cache: JsonCache;
  clientId: string;
  clientSecret: string;
  /** TWITCH_GTA6_GAME_ID: skips the /helix/games lookup. */
  gameIdOverride?: string | null;
};

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX = "https://api.twitch.tv/helix";
export const TWITCH_TOKEN_KEY = "twitch:app-token";
export const TWITCH_GAME_KEY = "twitch:gta6-game-id";
/** Game ids don't change; look it up again weekly in case the category was created late. */
const GAME_ID_TTL_SECONDS = 7 * 86_400;
const GAME_UNKNOWN_TTL_SECONDS = 15 * 60;

const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });

const clipSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  broadcaster_id: z.string(),
  broadcaster_name: z.string(),
  game_id: z.string(),
  title: z.string(),
  view_count: z.number(),
  created_at: z.string(),
  thumbnail_url: z.string(),
  duration: z.number(),
});
export type TwitchClip = z.infer<typeof clipSchema>;

const listSchema = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item) });
const gameSchema = z.object({ id: z.string().min(1), name: z.string() });
const userSchema = z.object({ id: z.string(), login: z.string() });

/** App access token, cached until five minutes before it expires (SPEC §6: in Upstash). */
async function appToken(deps: TwitchDeps, refresh = false): Promise<string> {
  if (!refresh) {
    const cached = await deps.cache.get<string>(TWITCH_TOKEN_KEY);
    if (cached) return cached;
  }
  const body = new URLSearchParams({
    client_id: deps.clientId,
    client_secret: deps.clientSecret,
    grant_type: "client_credentials",
  });
  const { status, body: json } = await fetchJson(deps.fetch, TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const parsed = tokenSchema.safeParse(json);
  if (status !== 200 || !parsed.success) throw new UpstreamError(status, `Twitch token request failed (${status})`);
  await deps.cache.set(TWITCH_TOKEN_KEY, parsed.data.access_token, Math.max(60, parsed.data.expires_in - 300));
  return parsed.data.access_token;
}

/** GET a Helix endpoint; on 401 the token is fetched again once (it may have been revoked). */
async function helix(deps: TwitchDeps, path: string, params: URLSearchParams): Promise<unknown> {
  const url = `${HELIX}${path}?${params.toString()}`;
  for (const refresh of [false, true]) {
    const token = await appToken(deps, refresh);
    const { status, body } = await fetchJson(deps.fetch, url, {
      headers: { Authorization: `Bearer ${token}`, "Client-Id": deps.clientId },
    });
    if (status === 401 && !refresh) {
      await deps.cache.del(TWITCH_TOKEN_KEY);
      continue;
    }
    if (status === 400 || status === 404) return { data: [] };
    if (status !== 200) throw new UpstreamError(status, `Twitch ${path} answered ${status}`);
    return body;
  }
  throw new UpstreamError(401, "Twitch refused the app token");
}

/** GTA VI's Twitch game id: TWITCH_GTA6_GAME_ID, else /helix/games?name=… (cached). Null if Twitch has none. */
export async function getGta6GameId(deps: TwitchDeps): Promise<string | null> {
  if (deps.gameIdOverride) return deps.gameIdOverride;
  const cached = await deps.cache.get<string>(TWITCH_GAME_KEY);
  if (cached) return cached === "none" ? null : cached;

  const body = await helix(deps, "/games", new URLSearchParams({ name: TWITCH_GTA6_GAME_NAME }));
  const games = listSchema(gameSchema).safeParse(body);
  const game = games.success ? games.data.data.find((item) => item.name === TWITCH_GTA6_GAME_NAME) : undefined;
  if (!game) {
    console.warn(`[clips] Twitch has no "${TWITCH_GTA6_GAME_NAME}" category; Twitch clips are refused for now.`);
    await deps.cache.set(TWITCH_GAME_KEY, "none", GAME_UNKNOWN_TTL_SECONDS);
    return null;
  }
  await deps.cache.set(TWITCH_GAME_KEY, game.id, GAME_ID_TTL_SECONDS);
  return game.id;
}

function parseClips(body: unknown): TwitchClip[] {
  const list = z.object({ data: z.array(z.unknown()) }).safeParse(body);
  if (!list.success) throw new UpstreamError(200, "Twitch sent an unexpected clip list");
  return list.data.data.flatMap((item) => {
    const clip = clipSchema.safeParse(item);
    return clip.success ? [clip.data] : [];
  });
}

export async function fetchTwitchClip(deps: TwitchDeps, slug: string): Promise<TwitchClip | null> {
  const clips = parseClips(await helix(deps, "/clips", new URLSearchParams({ id: slug })));
  return clips.find((clip) => clip.id === slug) ?? clips[0] ?? null;
}

/** Most-viewed GTA VI clips in a window (Helix sorts game clips by views). */
export async function fetchTopTwitchClips(
  deps: TwitchDeps,
  { gameId, since, until, first = 50 }: { gameId: string; since: Date; until: Date; first?: number },
): Promise<TwitchClip[]> {
  const params = new URLSearchParams({
    game_id: gameId,
    started_at: since.toISOString(),
    ended_at: until.toISOString(),
    first: String(Math.min(Math.max(first, 1), 100)),
  });
  return parseClips(await helix(deps, "/clips", params));
}

/** Broadcaster ids → logins, in one call (≤ 100 ids), for the creator's channel link. */
export async function fetchTwitchLogins(deps: TwitchDeps, ids: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (unique.length === 0) return new Map();
  const params = new URLSearchParams();
  for (const id of unique) params.append("id", id);
  const users = listSchema(userSchema).safeParse(await helix(deps, "/users", params));
  return new Map(users.success ? users.data.data.map((user) => [user.id, user.login]) : []);
}

/** Display names are usually the login in another case; non-Latin names need the /users lookup. */
function channelUrl(clip: TwitchClip, login: string | undefined): string | null {
  const name = login ?? (/^[A-Za-z0-9_]{3,25}$/.test(clip.broadcaster_name) ? clip.broadcaster_name : null);
  return name ? `https://www.twitch.tv/${name.toLowerCase()}` : null;
}

export function toResolvedTwitchClip(clip: TwitchClip, login?: string): ResolvedClip {
  return {
    platform: "twitch",
    externalId: clip.id,
    url: `https://clips.twitch.tv/${clip.id}`,
    title: cleanText(clip.title, 200) ?? "Twitch clip",
    creatorName: cleanText(clip.broadcaster_name, 100),
    creatorUrl: channelUrl(clip, login),
    durationSec: Math.round(clip.duration),
    thumbnailUrl: safeThumbnailUrl(clip.thumbnail_url),
    viewsOnPlatform: Number.isSafeInteger(clip.view_count) ? clip.view_count : null,
    orientation: "landscape",
  };
}

/** One submitted clip: must exist, be GTA VI and last ≤ 60 s. */
export async function resolveTwitchClip(deps: TwitchDeps, slug: string): Promise<ResolveResult> {
  const clip = await fetchTwitchClip(deps, slug);
  if (!clip) return { ok: false, code: "not_found", platform: "twitch" };
  const gameId = await getGta6GameId(deps);
  if (!gameId) return { ok: false, code: "game_unknown", platform: "twitch" };
  if (clip.game_id !== gameId) return { ok: false, code: "not_gta", platform: "twitch" };
  const durationSec = Math.round(clip.duration);
  if (durationSec > CLIP_MAX_SECONDS) return { ok: false, code: "too_long", platform: "twitch", durationSec };
  const logins = await fetchTwitchLogins(deps, [clip.broadcaster_id]).catch(() => new Map<string, string>());
  return { ok: true, clip: toResolvedTwitchClip(clip, logins.get(clip.broadcaster_id)) };
}
