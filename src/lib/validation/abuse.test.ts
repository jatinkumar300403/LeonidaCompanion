import { describe, expect, it } from "vitest";
import { clipSubmitSchema } from "./clip";
import { postInputSchema, reportSchema, threadInputSchema } from "./forum";
import { bioSchema, displayNameSchema, usernameProblem } from "./profile";
import { removalRequestSchema } from "./removal";

/**
 * Phase 10 abuse cases at the validation layer (D-101): unicode/RTL tricks and huge bodies.
 * The database repeats the length checks (supabase/tests/attacks.test.ts).
 */

describe("usernames refuse look-alikes and invisible tricks", () => {
  const tricks = {
    arabic: "محمد",
    hebrew: "שלום",
    rlo: "\u202Eadmin",
    zeroWidth: "ad\u200Bmin",
    cyrillicHomoglyph: "аdmin", // а (U+0430) + "dmin"
    fullwidth: "ａｄｍｉｎ",
    emoji: "gamer😀",
    combining: "ad́min",
    space: "big boss",
  };
  for (const [name, value] of Object.entries(tricks)) {
    it(name, () => expect(usernameProblem(value)).not.toBeNull());
  }
});

describe("display names and bios", () => {
  it("strip bidi overrides and zero-width characters", () => {
    expect(displayNameSchema.parse("\u202Etxt.exe\u200B")).toBe("txt.exe");
    expect(bioSchema.parse("Hi\u2066 there\u2069\nsecond line")).toBe("Hi there\nsecond line");
  });

  it("keep real right-to-left and non-Latin names", () => {
    expect(displayNameSchema.parse("  مرحبا يا صديقي ")).toBe("مرحبا يا صديقي");
    expect(displayNameSchema.parse("Лёша 🎮")).toBe("Лёша 🎮");
  });

  it("a name of only invisible characters is treated as empty", () => {
    expect(displayNameSchema.parse("\u200B\u202E\uFEFF")).toBeNull();
  });

  it("refuse oversized input", () => {
    expect(displayNameSchema.safeParse("x".repeat(41)).success).toBe(false);
    expect(bioSchema.safeParse("x".repeat(281)).success).toBe(false);
  });
});

describe("forum text", () => {
  const thread = {
    categoryId: "1",
    title: "How do I find the hidden garage?",
    body: "Some details that are long enough.",
  };

  it("a title padded with invisible characters can't pass the minimum length", () => {
    const padded = { ...thread, title: "Hi\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B" };
    expect(threadInputSchema.safeParse(padded).success).toBe(false);
  });

  it("titles lose bidi overrides and line breaks", () => {
    const parsed = threadInputSchema.parse({ ...thread, title: "\u202EWhere is\nthe garage?" });
    expect(parsed.title).toBe("Where is the garage?");
  });

  it("huge bodies are refused before they reach the database", () => {
    expect(threadInputSchema.safeParse({ ...thread, body: "x".repeat(20_001) }).success).toBe(false);
    expect(threadInputSchema.safeParse({ ...thread, title: "t".repeat(141) }).success).toBe(false);
    expect(postInputSchema.safeParse({ threadId: "1", body: "x".repeat(20_001) }).success).toBe(false);
    expect(postInputSchema.safeParse({ threadId: "1", body: "\u200B\u200B\u200B" }).success).toBe(false);
    expect(
      reportSchema.safeParse({ targetType: "post", targetId: "1", reason: "spam", details: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("clip captions and removal requests", () => {
  it("clean captions and refuse long ones", () => {
    const base = { url: "https://youtu.be/dQw4w9WgXcQ", category: "funny", notSpoiler: "on" };
    expect(clipSubmitSchema.parse({ ...base, caption: "\u202Ewow\u200B" }).caption).toBe("wow");
    expect(clipSubmitSchema.safeParse({ ...base, caption: "x".repeat(281) }).success).toBe(false);
  });

  it("clean the requester's name and refuse an oversized description", () => {
    const base = {
      name: "\u202EAlex",
      email: "alex@example.com",
      url: "https://example.com/clip",
      role: "creator",
      description: "This is my clip and I want it removed.",
      statement: true,
    };
    expect(removalRequestSchema.parse(base).name).toBe("Alex");
    expect(removalRequestSchema.safeParse({ ...base, description: "x".repeat(1501) }).success).toBe(false);
  });
});
