import { describe, expect, it } from "vitest";
import { newsletterConfirmEmail } from "@/emails/newsletter-confirm";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { buildIndexNowPayload } from "@/lib/indexnow";
import {
  CONFIRM_TOKEN_TTL_MS,
  confirmTokenSchema,
  generateConfirmToken,
  hashConfirmToken,
  isConfirmTokenExpired,
  mergeLists,
  subscribeSchema,
} from "./token";

describe("newsletter tokens", () => {
  it("generates url-safe tokens and stores only a hash", () => {
    const token = generateConfirmToken();
    expect(confirmTokenSchema.safeParse(token).success).toBe(true);
    expect(hashConfirmToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashConfirmToken(token)).not.toContain(token);
    expect(generateConfirmToken()).not.toBe(token);
    expect(confirmTokenSchema.safeParse("short").success).toBe(false);
  });

  it("expires after 7 days", () => {
    const now = Date.parse("2026-11-19T00:00:00Z");
    expect(isConfirmTokenExpired(new Date(now - 1000).toISOString(), now)).toBe(false);
    expect(isConfirmTokenExpired(new Date(now - CONFIRM_TOKEN_TTL_MS - 1).toISOString(), now)).toBe(true);
    expect(isConfirmTokenExpired(null, now)).toBe(true);
  });

  it("normalises the email and the list", () => {
    expect(subscribeSchema.parse({ email: "  Me@Example.COM " })).toEqual({ email: "me@example.com", list: "digest" });
    expect(subscribeSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: "a@b.co", list: "spam" }).success).toBe(false);
  });

  it("merges lists, dropping unknown ones", () => {
    expect(mergeLists(["digest"], ["online_waitlist", "digest"])).toEqual(["digest", "online_waitlist"]);
    expect(mergeLists([], ["bogus"])).toEqual([]);
  });
});

describe("newsletterConfirmEmail", () => {
  it("escapes every interpolated value and includes the link in both parts", () => {
    const email = newsletterConfirmEmail({
      siteName: "<Site>",
      confirmUrl: 'https://x.test/newsletter/confirm?token=a"b',
      list: "online_waitlist",
      disclaimer: "Unofficial & fan-made.",
    });
    expect(email.subject).toContain("Online waitlist");
    expect(email.html).toContain("&lt;Site&gt;");
    expect(email.html).not.toContain("<Site>");
    expect(email.html).toContain("token=a&quot;b");
    expect(email.html).toContain("Unofficial &amp; fan-made.");
    expect(email.text).toContain('https://x.test/newsletter/confirm?token=a"b');
  });
});

describe("isAuthorizedCron", () => {
  const secret = "s".repeat(64);
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(`bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCron(secret, secret)).toBe(false);
    expect(isAuthorizedCron(null, secret)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${secret}`, undefined)).toBe(false);
  });
});

describe("buildIndexNowPayload", () => {
  it("builds absolute URLs on the https site host", () => {
    expect(buildIndexNowPayload("https://example.com", "abcdef123456", ["/tips/a", "/tips/a", "/tips"])).toEqual({
      host: "example.com",
      key: "abcdef123456",
      keyLocation: "https://example.com/api/indexnow",
      urlList: ["https://example.com/tips/a", "https://example.com/tips"],
    });
  });

  it("refuses local sites, bad keys and empty lists", () => {
    expect(buildIndexNowPayload("http://localhost:3000", "abcdef123456", ["/tips"])).toBeNull();
    expect(buildIndexNowPayload("https://example.com", "bad key!", ["/tips"])).toBeNull();
    expect(buildIndexNowPayload("https://example.com", "abcdef123456", [])).toBeNull();
  });
});
