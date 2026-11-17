import { describe, expect, it } from "vitest";
import { hasRole, isBanActive, isOnboardingExempt } from "./paths";

describe("isOnboardingExempt", () => {
  it.each(["/onboarding", "/auth/callback", "/api/auth/username", "/sign-in", "/terms", "/community-guidelines"])(
    "lets %s through",
    (path) => expect(isOnboardingExempt(path)).toBe(true),
  );

  it("lets files through", () => {
    expect(isOnboardingExempt("/icon.svg")).toBe(true);
    expect(isOnboardingExempt("/robots.txt")).toBe(true);
  });

  it.each(["/", "/forum", "/settings", "/u/someone", "/admin", "/termsx", "/authority"])(
    "sends %s to onboarding",
    (path) => expect(isOnboardingExempt(path)).toBe(false),
  );
});

describe("hasRole", () => {
  it("orders admin above mod above user", () => {
    expect(hasRole("admin", "mod")).toBe(true);
    expect(hasRole("mod", "mod")).toBe(true);
    expect(hasRole("user", "mod")).toBe(false);
    expect(hasRole("mod", "admin")).toBe(false);
    expect(hasRole("user", "user")).toBe(true);
  });

  it("refuses unknown or missing roles", () => {
    expect(hasRole(undefined, "user")).toBe(false);
    expect(hasRole("owner", "user")).toBe(false);
  });
});

describe("isBanActive", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  it("is permanent without an end date and temporary with one", () => {
    expect(isBanActive(false, null, now)).toBe(false);
    expect(isBanActive(true, null, now)).toBe(true);
    expect(isBanActive(true, "2026-11-20T00:00:00Z", now)).toBe(true);
    expect(isBanActive(true, "2026-11-18T00:00:00Z", now)).toBe(false);
  });
});
