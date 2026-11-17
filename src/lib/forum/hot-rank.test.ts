import { describe, expect, it } from "vitest";
import { hotRank } from "./hot-rank";

const now = new Date("2026-11-19T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe("hotRank", () => {
  it("follows score / (hours + 2)^1.5", () => {
    expect(hotRank(10, hoursAgo(0), now)).toBeCloseTo(10 / Math.pow(2, 1.5));
    expect(hotRank(10, hoursAgo(7), now)).toBeCloseTo(10 / 27);
  });

  it("ranks newer threads above older ones with the same score", () => {
    expect(hotRank(5, hoursAgo(1), now)).toBeGreaterThan(hotRank(5, hoursAgo(10), now));
  });

  it("lets a much higher score beat recency", () => {
    expect(hotRank(100, hoursAgo(24), now)).toBeGreaterThan(hotRank(2, hoursAgo(0), now));
  });

  it("keeps zero at zero and negatives below it", () => {
    expect(hotRank(0, hoursAgo(3), now)).toBe(0);
    expect(hotRank(-3, hoursAgo(3), now)).toBeLessThan(0);
  });

  it("treats future timestamps (clock skew) as brand new", () => {
    expect(hotRank(4, new Date(now.getTime() + 60_000), now)).toBeCloseTo(4 / Math.pow(2, 1.5));
  });
});
