import { describe, expect, it } from "vitest";
import { forumFieldErrors, postInputSchema, reportSchema, threadInputSchema, voteSchema } from "./forum";

describe("threadInputSchema", () => {
  const valid = {
    categoryId: "1",
    title: "  How do I lose the cops?  ",
    body: "I keep getting caught near the docks.",
  };

  it("trims, coerces and defaults", () => {
    expect(threadInputSchema.parse({ ...valid, tags: ["money", "money"], isSpoiler: "on" })).toEqual({
      categoryId: 1,
      title: "How do I lose the cops?",
      body: "I keep getting caught near the docks.",
      tags: ["money"],
      isSpoiler: true,
    });
    expect(threadInputSchema.parse(valid).isSpoiler).toBe(false);
  });

  it("enforces SPEC §5 limits", () => {
    const short = threadInputSchema.safeParse({ ...valid, title: "Too short" });
    expect(short.success).toBe(false);
    if (!short.success) expect(forumFieldErrors(short.error).title).toMatch(/at least 10/);
    expect(threadInputSchema.safeParse({ ...valid, title: "x".repeat(141) }).success).toBe(false);
    expect(threadInputSchema.safeParse({ ...valid, body: "x".repeat(20_001) }).success).toBe(false);
    expect(
      threadInputSchema.safeParse({ ...valid, tags: ["money", "combat", "driving", "stealth", "missions", "heists"] })
        .success,
    ).toBe(false);
    expect(threadInputSchema.safeParse({ ...valid, tags: ["not-a-tag"] }).success).toBe(false);
  });
});

describe("postInputSchema", () => {
  it("accepts an optional quoted post", () => {
    expect(postInputSchema.parse({ threadId: "4", body: "Thanks!", replyToPostId: "" })).toEqual({
      threadId: 4,
      body: "Thanks!",
      replyToPostId: null,
    });
    expect(postInputSchema.parse({ threadId: 4, body: "Yes", replyToPostId: "9" }).replyToPostId).toBe(9);
    expect(postInputSchema.safeParse({ threadId: 4, body: " " }).success).toBe(false);
  });
});

describe("voteSchema and reportSchema", () => {
  it("accept only known values", () => {
    expect(voteSchema.safeParse({ targetType: "post", targetId: 1, value: 0 }).success).toBe(true);
    expect(voteSchema.safeParse({ targetType: "clip", targetId: 1, value: 1 }).success).toBe(false);
    expect(voteSchema.safeParse({ targetType: "post", targetId: 1, value: 2 }).success).toBe(false);
    expect(reportSchema.parse({ targetType: "post", targetId: "12", reason: "spoiler" }).details).toBe("");
    expect(reportSchema.safeParse({ targetType: "post", targetId: "12", reason: "copyright" }).success).toBe(false);
  });
});
