import { describe, expect, it } from "vitest";
import { createMemoryLimiter, windowMs } from "./fallback";
import { RATE_LIMITS } from "./keys";

describe("windowMs", () => {
  it("parses every window in RATE_LIMITS", () => {
    for (const { window } of Object.values(RATE_LIMITS)) expect(windowMs(window)).toBeGreaterThan(0);
    expect(windowMs("15 m")).toBe(900_000);
    expect(windowMs("1 d")).toBe(86_400_000);
  });

  it("refuses a malformed window", () => {
    expect(() => windowMs("an hour")).toThrow();
  });
});

describe("createMemoryLimiter (D-105)", () => {
  it("lets `limit` requests through per window, then refuses with a retry time", () => {
    let time = 0;
    const limiter = createMemoryLimiter({ now: () => time });
    const results = Array.from({ length: 100 }, () => limiter.hit("clipSubmit:user", 10, 3_600_000));
    expect(results.filter((result) => result.success)).toHaveLength(10);
    expect(results[10]).toEqual({ success: false, retryAfterSeconds: 3600 });

    time = 1_800_000;
    expect(limiter.hit("clipSubmit:user", 10, 3_600_000)).toEqual({ success: false, retryAfterSeconds: 1800 });
    time = 3_600_001;
    expect(limiter.hit("clipSubmit:user", 10, 3_600_000).success).toBe(true);
  });

  it("keeps keys apart", () => {
    const limiter = createMemoryLimiter({ now: () => 0 });
    expect(limiter.hit("a", 1, 1000).success).toBe(true);
    expect(limiter.hit("a", 1, 1000).success).toBe(false);
    expect(limiter.hit("b", 1, 1000).success).toBe(true);
  });

  it("caps memory by dropping the least recently used keys", () => {
    const limiter = createMemoryLimiter({ now: () => 0, maxKeys: 3 });
    for (const key of ["a", "b", "c", "d"]) limiter.hit(key, 1, 1000);
    expect(limiter.size()).toBe(3);
    expect(limiter.hit("a", 1, 1000).success).toBe(true); // "a" was dropped, so it starts over
    expect(limiter.hit("d", 1, 1000).success).toBe(false);
  });
});
