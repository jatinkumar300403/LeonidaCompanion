import { describe, expect, it } from "vitest";
import { clientIp, hashIdentifier, RATE_LIMITS, rateLimitKey } from "./keys";

describe("rate-limit keys", () => {
  it("hashes identifiers with the salt and never includes them in clear text", () => {
    const key = rateLimitKey("magicLinkEmail", "Me@Example.com", "salt");
    expect(key).toMatch(/^magicLinkEmail:[0-9a-f]{32}$/);
    expect(key).not.toContain("example");
  });

  it("is stable, case-insensitive and salt-dependent", () => {
    expect(hashIdentifier("ME@example.com ", "s")).toBe(hashIdentifier("me@example.com", "s"));
    expect(hashIdentifier("me@example.com", "s1")).not.toBe(hashIdentifier("me@example.com", "s2"));
  });

  it("keeps scopes apart", () => {
    expect(rateLimitKey("onboarding", "u1", "s")).not.toBe(rateLimitKey("profileUpdate", "u1", "s"));
  });

  it("defines a positive limit for every scope", () => {
    for (const { limit } of Object.values(RATE_LIMITS)) expect(limit).toBeGreaterThan(0);
  });
});

describe("clientIp", () => {
  const headers = (values: Record<string, string>) => new Headers(values);

  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" }))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(headers({}))).toBe("unknown");
  });
});
