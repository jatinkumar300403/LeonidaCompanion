import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "@/env";
import { getRedis } from "@/server/cache/redis";
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

/**
 * Checks and counts one request. Without Upstash (local dev only: production refuses to boot
 * without it, D-023) every request passes. A Redis error also lets the request through and is
 * logged, so an Upstash outage can't lock everyone out on launch day (D-043).
 */
export async function rateLimit(scope: RateLimitScope, identifier: string): Promise<RateLimitResult> {
  const limiter = limiterFor(scope);
  if (!limiter) return { success: true, retryAfterSeconds: 0 };
  try {
    const result = await limiter.limit(rateLimitKey(scope, identifier, env.ANON_HASH_SALT ?? "dev-salt"));
    return {
      success: result.success,
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error(`[ratelimit] ${scope} check failed; allowing the request.`, error);
    return { success: true, retryAfterSeconds: 0 };
  }
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return minutes <= 1
    ? "Too many attempts. Please wait a minute and try again."
    : `Too many attempts. Please try again in about ${minutes} minutes.`;
}
