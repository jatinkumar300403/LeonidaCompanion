import "server-only";
import { Redis } from "@upstash/redis";
import { env, integrations } from "@/env";

/**
 * The one Upstash client (rate limits and small server caches such as the Twitch app token).
 * Null without Upstash: local dev only, production refuses to boot without it (D-023).
 */
let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  redis =
    integrations.upstash && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
      : null;
  return redis;
}

/** A tiny JSON cache. Errors never throw: a cache miss just means "fetch it again". */
export type JsonCache = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
};

/** Process-local cache (tests, the dev mock, and local dev without Upstash). */
export function memoryCache(): JsonCache {
  const entries = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get<T>(key: string) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000 });
    },
    async del(key) {
      entries.delete(key);
    },
  };
}

const localFallback = memoryCache();

/** Upstash when configured, else the process-local cache. */
export function sharedCache(): JsonCache {
  const client = getRedis();
  if (!client) return localFallback;
  return {
    async get<T>(key: string) {
      try {
        return (await client.get<T>(key)) ?? null;
      } catch (error) {
        console.error(`[cache] read of ${key} failed`, error);
        return null;
      }
    },
    async set(key, value, ttlSeconds) {
      try {
        await client.set(key, value, { ex: Math.max(1, Math.floor(ttlSeconds)) });
      } catch (error) {
        console.error(`[cache] write of ${key} failed`, error);
      }
    },
    async del(key) {
      try {
        await client.del(key);
      } catch (error) {
        console.error(`[cache] delete of ${key} failed`, error);
      }
    },
  };
}
