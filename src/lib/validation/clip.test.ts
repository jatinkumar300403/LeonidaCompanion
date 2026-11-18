import { describe, expect, it } from "vitest";
import { clipFieldErrors, clipReviewSchema, clipSubmitSchema, clipVoteSchema } from "./clip";

describe("clipSubmitSchema", () => {
  const valid = { url: " https://youtu.be/dQw4w9WgXcQ ", category: "funny", caption: "  Nice  ", notSpoiler: "on" };

  it("accepts a complete submission and trims it", () => {
    expect(clipSubmitSchema.parse(valid)).toEqual({
      url: "https://youtu.be/dQw4w9WgXcQ",
      category: "funny",
      caption: "Nice",
      notSpoiler: true,
    });
  });

  it("stores glitch, never glitch-funny (D-015)", () => {
    expect(clipSubmitSchema.safeParse({ ...valid, category: "glitch" }).success).toBe(true);
    expect(clipSubmitSchema.safeParse({ ...valid, category: "glitch-funny" }).success).toBe(false);
  });

  it("requires the spoiler confirmation", () => {
    const result = clipSubmitSchema.safeParse({ ...valid, notSpoiler: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(clipFieldErrors(result.error).notSpoiler).toMatch(/story spoiler/);
  });

  it("limits captions to 140 characters and allows none", () => {
    expect(clipSubmitSchema.safeParse({ ...valid, caption: "x".repeat(141) }).success).toBe(false);
    expect(clipSubmitSchema.parse({ ...valid, caption: undefined }).caption).toBe("");
  });

  it("needs a link", () => {
    const result = clipSubmitSchema.safeParse({ ...valid, url: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(clipFieldErrors(result.error).url).toBe("Paste a clip link first.");
  });
});

describe("clipVoteSchema", () => {
  it("accepts -1, 0 and 1 only", () => {
    expect(clipVoteSchema.safeParse({ clipId: 4, value: 1 }).success).toBe(true);
    expect(clipVoteSchema.safeParse({ clipId: 4, value: 0 }).success).toBe(true);
    expect(clipVoteSchema.safeParse({ clipId: 4, value: 2 }).success).toBe(false);
    expect(clipVoteSchema.safeParse({ clipId: -4, value: 1 }).success).toBe(false);
  });
});

describe("clipReviewSchema", () => {
  it("approves with an optional category", () => {
    expect(clipReviewSchema.parse({ id: 3, decision: "approve", category: "epic" })).toEqual({
      id: 3,
      decision: "approve",
      category: "epic",
    });
  });

  it("needs a reason to reject or remove", () => {
    expect(clipReviewSchema.safeParse({ id: 3, decision: "reject", reason: "" }).success).toBe(false);
    expect(clipReviewSchema.safeParse({ id: 3, decision: "remove", reason: "Creator asked" }).success).toBe(true);
    expect(clipReviewSchema.safeParse({ id: 3, decision: "delete" }).success).toBe(false);
  });
});
