/**
 * In-process fallback limiter (Phase 10, D-105). When Upstash is slow (the 2 s timeout) or down,
 * the request used to pass unchecked (D-043), so a burst sent at a cold connection got through
 * whole. Now the same limit is applied per server instance instead: nobody is locked out by an
 * Upstash outage, but one client can't push more than the limit through one instance. Pure and
 * unit-tested; the clock is injectable.
 */

const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** "15 m", "1 h", "1 d" → milliseconds (the window strings in RATE_LIMITS). */
export function windowMs(window: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(window.trim());
  if (!match) throw new Error(`Unknown rate-limit window: ${window}`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}

export type MemoryLimiter = {
  /** Counts one request for `key`; false once `limit` requests fall inside the window. */
  hit(key: string, limit: number, windowMillis: number): { success: boolean; retryAfterSeconds: number };
  size(): number;
};

/** A sliding-log limiter in memory, capped at `maxKeys` (oldest keys are dropped first). */
export function createMemoryLimiter({
  now = Date.now,
  maxKeys = 10_000,
}: { now?: () => number; maxKeys?: number } = {}): MemoryLimiter {
  const log = new Map<string, number[]>();
  return {
    hit(key, limit, windowMillis) {
      const at = now();
      const recent = (log.get(key) ?? []).filter((time) => time > at - windowMillis);
      if (recent.length >= limit) {
        log.set(key, recent);
        return { success: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0]! + windowMillis - at) / 1000)) };
      }
      recent.push(at);
      log.delete(key); // re-insert so Map order tracks recent use
      log.set(key, recent);
      while (log.size > maxKeys) log.delete(log.keys().next().value!);
      return { success: true, retryAfterSeconds: 0 };
    },
    size: () => log.size,
  };
}
