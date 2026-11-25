import { describe, expect, it } from "vitest";
import { onboardingPath, safeNextPath, signInPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/forum/t/1/hello?sort=new#post-2")).toBe("/forum/t/1/hello?sort=new#post-2");
    expect(safeNextPath("/settings")).toBe("/settings");
  });

  it.each([
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["encoded backslash decoded upstream", "/\\/evil.example"],
    ["javascript scheme", "javascript:alert(1)"],
    ["data scheme", "data:text/html,hi"],
    ["no leading slash", "settings"],
    ["tab inside", "/\t/evil.example"],
    ["newline inside", "/foo\nbar"],
    ["empty", ""],
    ["whitespace", "   "],
    // Phase 10 (D-103): dot segments that normalise into a protocol-relative "//host".
    ["dot segment before //", "/.//evil.example"],
    ["parent segment before //", "/x/..//evil.example"],
    ["encoded parent segment", "/%2e%2e//evil.example"],
    ["climbing above the root", "/a/../..//evil.example/x"],
    ["dot segment before a backslash", "/./\\evil.example"],
    ["https without slashes", "https:evil.example"],
    ["fullwidth solidus", "／／evil.example"],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it.each(["/%2F%2Fevil.example", "/%5Cevil.example", "/.%2F/evil.example", "/tips/../forum"])(
    "keeps %s on this site",
    (value) => {
      const out = safeNextPath(value);
      expect(new URL(out, "https://site.example/auth/callback").origin).toBe("https://site.example");
    },
  );

  it("rejects non-strings and very long values", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(["/a"])).toBe("/");
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBe("/");
  });

  it("never sends people back into the auth flow or APIs", () => {
    expect(safeNextPath("/auth/callback?code=x")).toBe("/");
    expect(safeNextPath("/api/me/export")).toBe("/");
    expect(safeNextPath("/sign-in")).toBe("/");
    expect(safeNextPath("/onboarding?next=/x")).toBe("/");
    expect(safeNextPath("/sign-inner")).toBe("/");
    expect(safeNextPath("/authors")).toBe("/authors");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("https://x.example", "/settings")).toBe("/settings");
  });
});

describe("signInPath / onboardingPath", () => {
  it("adds an encoded next only when it is useful and safe", () => {
    expect(signInPath("/forum/new?title=a b")).toBe("/sign-in?next=%2Fforum%2Fnew%3Ftitle%3Da%2520b");
    expect(signInPath("/")).toBe("/sign-in");
    expect(signInPath("https://evil.example")).toBe("/sign-in");
    expect(onboardingPath("/settings")).toBe("/onboarding?next=%2Fsettings");
    expect(onboardingPath(undefined)).toBe("/onboarding");
  });
});
