import { describe, expect, it } from "vitest";
import { formatCount, formatDuration, formatRelativeTime, hostnameOf, humanizeSlug } from "./format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1k"],
    [1240, "1.2k"],
    [15_300, "15k"],
    [1_250_000, "1.3M"],
    [-1500, "-1.5k"],
  ])("%d → %s", (input, expected) => {
    expect(formatCount(input)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [24, "0:24"],
    [75, "1:15"],
    [59.6, "1:00"],
    [-5, "0:00"],
  ])("%d s → %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it.each([
    ["2026-11-20T11:59:30Z", "just now"],
    ["2026-11-20T11:55:00Z", "5m ago"],
    ["2026-11-20T10:00:00Z", "2h ago"],
    ["2026-11-17T12:00:00Z", "3d ago"],
    ["2026-11-01T12:00:00Z", "1 Nov"],
  ])("%s → %s", (input, expected) => {
    expect(formatRelativeTime(input, now)).toBe(expected);
  });
});

describe("hostnameOf", () => {
  it("strips www and returns null for junk", () => {
    expect(hostnameOf("https://www.rockstargames.com/newswire")).toBe("rockstargames.com");
    expect(hostnameOf("https://gta.fandom.com/wiki/x")).toBe("gta.fandom.com");
    expect(hostnameOf("not a url")).toBeNull();
  });
});

describe("humanizeSlug", () => {
  it("turns a slug into a sentence-case title", () => {
    expect(humanizeSlug("lose-wanted-level-fast")).toBe("Lose wanted level fast");
    expect(humanizeSlug("caf%C3%A9_tips")).toBe("Café tips");
    expect(humanizeSlug("")).toBe("");
  });
});
