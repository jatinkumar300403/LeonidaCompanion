import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "@/env";
import { getRedis } from "@/server/cache/redis";
import { createMemoryLimiter, windowMs } from "./fallback";
import { RATE_LIMITS, rateLimitKey, type RateLimitScope } from "./keys";

export type RateLimitResult = { success: boolean; retryAfterSeconds: number };

const limiters = new Map<RateLimitScope, Ratelimit>();

function limiterFor(scope: RateLimitScope): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  let limiter = limiters.get(scope);
  if (!limiter) {
    const { limit, window } = RATE_LIMITS[scope];
    limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: "rl", timeout: 2000 });
    limiters.set(scope, limiter);
  }
  return limiter;
}

const fallback = createMemoryLimiter();

/** The same limit, counted in this server instance only (D-105). */
function fallbackHit(scope: RateLimitScope, key: string): RateLimitResult {
  const { limit, window } = RATE_LIMITS[scope];
  return fallback.hit(key, limit, windowMs(window));
}

/**
 * Checks and counts one request. Without Upstash (local dev only: production refuses to boot
 * without it, D-023) every request passes. When Upstash times out (2 s) or errors, the request is
 * checked against an in-process copy of the same limit instead (D-105), so an Upstash outage
 * can't lock everyone out on launch day (D-043) and a burst can't slip through a slow connection.
 */
export async function rateLimit(scope: RateLimitScope, identifier: string): Promise<RateLimitResult> {
  const limiter = limiterFor(scope);
  if (!limiter) return { success: true, retryAfterSeconds: 0 };
  const key = rateLimitKey(scope, identifier, env.ANON_HASH_SALT ?? "dev-salt");
  try {
    const result = await limiter.limit(key);
    if (result.reason === "timeout") {
      console.warn(`[ratelimit] ${scope} timed out; using the in-process limit.`);
      return fallbackHit(scope, key);
    }
    return {
      success: result.success,
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error(`[ratelimit] ${scope} check failed; using the in-process limit.`, error);
    return fallbackHit(scope, key);
  }
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return minutes <= 1
    ? "Too many attempts. Please wait a minute and try again."
    : `Too many attempts. Please try again in about ${minutes} minutes.`;
}
