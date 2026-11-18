import { describe, expect, it } from "vitest";
import {
  canEdit,
  canPostLinks,
  containsLink,
  EDIT_WINDOW_MS,
  isCategoryReadOnly,
  isNewAccount,
  isThinThread,
  writeLimitScope,
} from "./rules";

const NOW = Date.parse("2026-11-19T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

describe("containsLink", () => {
  it("finds anything markdown would render as a link", () => {
    for (const text of [
      "see https://example.com",
      "HTTP://EXAMPLE.COM",
      "go to www.example.com",
      "[text](/relative)",
      "<mailto:someone@example.com>",
      "intro\n  [1]: //evil.example",
    ]) {
      expect(containsLink(text), text).toBe(true);
    }
  });

  it("ignores plain text, mentions and brackets", () => {
    for (const text of ["plain text", "@someone said hi", "a [bracket] then (paren)", "5 < 6 and 7 > 3"]) {
      expect(containsLink(text), text).toBe(false);
    }
  });
});

describe("account trust (SPEC §5)", () => {
  it("is new in the first 24 hours or under 5 reputation", () => {
    expect(isNewAccount({ role: "user", reputation: 50, createdAt: hoursAgo(2) }, NOW)).toBe(true);
    expect(isNewAccount({ role: "user", reputation: 4, createdAt: hoursAgo(72) }, NOW)).toBe(true);
    expect(isNewAccount({ role: "user", reputation: 5, createdAt: hoursAgo(25) }, NOW)).toBe(false);
    expect(isNewAccount({ role: "mod", reputation: 0, createdAt: hoursAgo(1) }, NOW)).toBe(false);
  });

  it("allows links from 20 reputation on a day-old account, and staff always", () => {
    expect(canPostLinks({ role: "user", reputation: 19, createdAt: hoursAgo(48) }, NOW)).toBe(false);
    expect(canPostLinks({ role: "user", reputation: 20, createdAt: hoursAgo(23) }, NOW)).toBe(false);
    expect(canPostLinks({ role: "user", reputation: 20, createdAt: hoursAgo(24) }, NOW)).toBe(true);
    expect(canPostLinks({ role: "admin", reputation: 0, createdAt: hoursAgo(0) }, NOW)).toBe(true);
  });
});

describe("canEdit", () => {
  const createdAt = new Date(NOW - EDIT_WINDOW_MS + 60_000).toISOString();
  it("lets the author edit within 30 minutes", () => {
    expect(canEdit({ createdAt, authorId: "a" }, { id: "a", role: "user" }, NOW)).toBe(true);
    expect(canEdit({ createdAt, authorId: "a" }, { id: "a", role: "user" }, NOW + 120_000)).toBe(false);
  });
  it("never lets others edit, but staff always can", () => {
    expect(canEdit({ createdAt, authorId: "a" }, { id: "b", role: "user" }, NOW)).toBe(false);
    expect(canEdit({ createdAt, authorId: "a" }, null, NOW)).toBe(false);
    expect(canEdit({ createdAt: hoursAgo(500), authorId: "a" }, { id: "m", role: "mod" }, NOW)).toBe(true);
  });
});

describe("isCategoryReadOnly (D-018)", () => {
  it("locks locked categories and Online while the flag is off", () => {
    expect(isCategoryReadOnly({ slug: "help", isLocked: false }, { FEATURE_ONLINE: false })).toBe(false);
    expect(isCategoryReadOnly({ slug: "help", isLocked: true }, { FEATURE_ONLINE: true })).toBe(true);
    expect(isCategoryReadOnly({ slug: "online", isLocked: false }, { FEATURE_ONLINE: false })).toBe(true);
    expect(isCategoryReadOnly({ slug: "online", isLocked: false }, { FEATURE_ONLINE: true })).toBe(false);
  });
});

describe("isThinThread (D-017)", () => {
  it("is thin with no replies and under 200 characters", () => {
    expect(isThinThread({ replyCount: 0, bodyMd: "short" })).toBe(true);
    expect(isThinThread({ replyCount: 0, bodyMd: "x".repeat(200) })).toBe(false);
    expect(isThinThread({ replyCount: 1, bodyMd: "short" })).toBe(false);
  });
});

describe("writeLimitScope", () => {
  it("gives rep ≥ 100 the trusted tier", () => {
    expect(writeLimitScope("thread", 99)).toBe("forumThread");
    expect(writeLimitScope("thread", 100)).toBe("forumThreadTrusted");
    expect(writeLimitScope("post", 0)).toBe("forumPost");
    expect(writeLimitScope("post", 250)).toBe("forumPostTrusted");
  });
});
