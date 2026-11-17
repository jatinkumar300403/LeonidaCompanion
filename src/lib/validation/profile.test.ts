import { describe, expect, it } from "vitest";
import {
  bioSchema,
  deleteAccountSchema,
  displayNameSchema,
  fieldErrors,
  magicLinkSchema,
  notificationPrefsSchema,
  onboardingSchema,
  platformSchema,
  profileUpdateSchema,
  usernameProblem,
  usernameSchema,
} from "./profile";

describe("usernames (SPEC §9)", () => {
  it("accepts 3–20 lowercase letters, numbers and underscores", () => {
    expect(usernameProblem("vice_runner")).toBeNull();
    expect(usernameProblem("abc")).toBeNull();
    expect(usernameProblem("a".repeat(20))).toBeNull();
  });

  it("normalises case, spaces and a leading @", () => {
    expect(usernameSchema.parse("  @Vice_Runner ")).toBe("vice_runner");
  });

  it.each([
    ["ab", "at least 3"],
    ["a".repeat(21), "at most 20"],
    ["vice-runner", "only lowercase"],
    ["vice runner", "only lowercase"],
    ["vicé", "only lowercase"],
    ["admin", "reserved"],
    ["Rockstar", "reserved"],
    ["mod", "reserved"],
  ])("rejects %s", (value, message) => {
    expect(usernameProblem(value)).toContain(message);
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe("profile fields", () => {
  it("turns empty optional text into null and enforces limits", () => {
    expect(displayNameSchema.parse("  ")).toBeNull();
    expect(displayNameSchema.parse(" Jas ")).toBe("Jas");
    expect(displayNameSchema.safeParse("x".repeat(41)).success).toBe(false);
    expect(bioSchema.parse(undefined)).toBeNull();
    expect(bioSchema.safeParse("x".repeat(281)).success).toBe(false);
    expect(bioSchema.parse("a\r\n\n\n\nb")).toBe("a\n\nb");
  });

  it("accepts only known platforms", () => {
    expect(platformSchema.parse("ps5")).toBe("ps5");
    expect(platformSchema.parse("")).toBeNull();
    expect(platformSchema.parse(undefined)).toBeNull();
    expect(platformSchema.safeParse("pc").success).toBe(false);
  });

  it("parses a profile update form", () => {
    expect(profileUpdateSchema.parse({ displayName: "", bio: "hi", platform: "both" })).toEqual({
      displayName: null,
      bio: "hi",
      platform: "both",
    });
  });

  it("reads the notification checkbox", () => {
    expect(notificationPrefsSchema.parse({ notifyEmailReplies: "on" }).notifyEmailReplies).toBe(true);
    expect(notificationPrefsSchema.parse({}).notifyEmailReplies).toBe(false);
  });
});

describe("onboarding", () => {
  const valid = {
    username: "Vice_Runner",
    displayName: "",
    platform: "ps5",
    ageConfirmed: "on",
    termsAccepted: "on",
  };

  it("accepts a complete form", () => {
    expect(onboardingSchema.parse(valid)).toMatchObject({
      username: "vice_runner",
      displayName: null,
      platform: "ps5",
    });
  });

  it("requires the 16+ and terms checkboxes", () => {
    const result = onboardingSchema.safeParse({ ...valid, ageConfirmed: undefined, termsAccepted: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.ageConfirmed).toContain("16 or older");
      expect(errors.termsAccepted).toContain("Terms");
    }
  });
});

describe("magic link and delete forms", () => {
  it("normalises the email", () => {
    expect(magicLinkSchema.parse({ email: "  Me@Example.COM " }).email).toBe("me@example.com");
    expect(magicLinkSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("reads the delete confirmation", () => {
    expect(deleteAccountSchema.parse({ confirmUsername: " @Vice_Runner", removePosts: "on" })).toEqual({
      confirmUsername: "vice_runner",
      removePosts: true,
    });
    expect(deleteAccountSchema.parse({ confirmUsername: "x" }).removePosts).toBe(false);
  });
});
