import { beforeEach, describe, expect, it, vi } from "vitest";

/** D-105: Upstash timeouts and errors fall back to an in-process limit instead of allowing all. */
const limit = vi.fn();

vi.mock("@/env", () => ({ env: { ANON_HASH_SALT: "test-salt" } }));
vi.mock("@/server/cache/redis", () => ({ getRedis: () => ({}) }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = () => ({});
    limit = limit;
  }
  return { Ratelimit };
});

const { rateLimit } = await import("./limit");

beforeEach(() => {
  limit.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("rateLimit", () => {
  it("passes Upstash's answer through", async () => {
    limit.mockResolvedValueOnce({ success: true, reset: Date.now() + 1000 });
    expect(await rateLimit("clipSubmit", "u-ok")).toEqual({ success: true, retryAfterSeconds: 0 });
    limit.mockResolvedValueOnce({ success: false, reset: Date.now() + 30_000 });
    expect((await rateLimit("clipSubmit", "u-ok")).success).toBe(false);
  });

  it("a burst during an Upstash timeout stops at the scope's limit (clipSubmit: 10)", async () => {
    limit.mockResolvedValue({ success: true, reason: "timeout", reset: 0 });
    const results = await Promise.all(Array.from({ length: 100 }, () => rateLimit("clipSubmit", "u-burst")));
    expect(results.filter((result) => result.success)).toHaveLength(10);
  });

  it("an Upstash error doesn't lock anyone out, but still limits", async () => {
    limit.mockRejectedValue(new Error("ECONNRESET"));
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit("forumThread", "u-down")));
    expect(results.filter((result) => result.success)).toHaveLength(10);
    expect((await rateLimit("forumThread", "someone-else")).success).toBe(true);
  });
});
