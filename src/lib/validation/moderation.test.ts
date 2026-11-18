import { describe, expect, it } from "vitest";
import {
  banSchema,
  banUntil,
  contentDecisionSchema,
  flagsInputSchema,
  moveThreadSchema,
  parseModerationParams,
  resolveReportsSchema,
  roleChangeSchema,
  unbanSchema,
  userSearchTerm,
} from "./moderation";

const USER = "6f1c1a8e-3f0a-4b4e-9a35-2c6f0c9d2b11";

describe("contentDecisionSchema", () => {
  it("accepts the decisions that fit each kind", () => {
    expect(contentDecisionSchema.safeParse({ targetType: "thread", id: "3", decision: "lock" }).success).toBe(true);
    expect(contentDecisionSchema.safeParse({ targetType: "post", id: 3, decision: "approve" }).success).toBe(true);
    expect(
      contentDecisionSchema.safeParse({ targetType: "clip", id: 3, decision: "remove", reason: "Spoiler" }).success,
    ).toBe(true);
  });
  it("refuses decisions that don't fit, bad ids and clip removals without a reason", () => {
    expect(contentDecisionSchema.safeParse({ targetType: "post", id: 3, decision: "lock" }).success).toBe(false);
    expect(contentDecisionSchema.safeParse({ targetType: "clip", id: 3, decision: "approve" }).success).toBe(false);
    expect(contentDecisionSchema.safeParse({ targetType: "clip", id: 3, decision: "remove" }).success).toBe(false);
    expect(contentDecisionSchema.safeParse({ targetType: "thread", id: -1, decision: "remove" }).success).toBe(false);
    expect(contentDecisionSchema.safeParse({ targetType: "user", id: 1, decision: "remove" }).success).toBe(false);
  });
  it("turns an empty reason into null", () => {
    expect(contentDecisionSchema.parse({ targetType: "thread", id: 1, decision: "remove", reason: " " }).reason).toBe(
      null,
    );
  });
});

describe("resolveReportsSchema", () => {
  it("accepts a dismissal and a removal", () => {
    expect(resolveReportsSchema.parse({ targetType: "profile", targetId: USER, outcome: "dismissed" })).toMatchObject({
      remove: false,
      reason: null,
    });
    expect(
      resolveReportsSchema.safeParse({ targetType: "post", targetId: "9", outcome: "actioned", remove: true }).success,
    ).toBe(true);
  });
  it("refuses removing on a dismissal or on a profile", () => {
    expect(
      resolveReportsSchema.safeParse({ targetType: "post", targetId: "9", outcome: "dismissed", remove: true }).success,
    ).toBe(false);
    expect(
      resolveReportsSchema.safeParse({ targetType: "profile", targetId: USER, outcome: "actioned", remove: true })
        .success,
    ).toBe(false);
  });
});

describe("bans and roles", () => {
  it("needs a reason and a known length", () => {
    expect(banSchema.safeParse({ userId: USER, duration: "7d", reason: "Spam links" }).success).toBe(true);
    expect(banSchema.safeParse({ userId: USER, duration: "7d", reason: "x" }).success).toBe(false);
    expect(banSchema.safeParse({ userId: USER, duration: "2y", reason: "Spam" }).success).toBe(false);
    expect(banSchema.safeParse({ userId: "nope", duration: "1d", reason: "Spam" }).success).toBe(false);
  });
  it("computes when a ban ends", () => {
    const now = new Date("2026-11-19T10:00:00Z");
    expect(banUntil("1d", now)).toBe("2026-11-20T10:00:00.000Z");
    expect(banUntil("30d", now)).toBe("2026-12-19T10:00:00.000Z");
    expect(banUntil("perm", now)).toBeNull();
  });
  it("validates unbans and roles", () => {
    expect(unbanSchema.parse({ userId: USER }).reason).toBeNull();
    expect(roleChangeSchema.safeParse({ userId: USER, role: "mod" }).success).toBe(true);
    expect(roleChangeSchema.safeParse({ userId: USER, role: "owner" }).success).toBe(false);
  });
  it("validates thread moves", () => {
    expect(moveThreadSchema.parse({ id: "4", categoryId: "2" })).toEqual({ id: 4, categoryId: 2 });
  });
});

describe("flagsInputSchema", () => {
  it("needs every flag as a boolean", () => {
    const flags = {
      FEATURE_ONLINE: false,
      FEATURE_ADS: false,
      FEATURE_ASK_ANON: true,
      MAINTENANCE_MODE: false,
      SHADOW_HOLD_NEW_USERS: true,
    };
    expect(flagsInputSchema.safeParse(flags).success).toBe(true);
    expect(flagsInputSchema.safeParse({ ...flags, MAINTENANCE_MODE: "yes" }).success).toBe(false);
    expect(flagsInputSchema.safeParse({ FEATURE_ONLINE: true }).success).toBe(false);
  });
});

describe("queue params and user search", () => {
  it("defaults to the Held tab and all actions", () => {
    expect(parseModerationParams({})).toEqual({ tab: "held", filter: "all" });
    expect(parseModerationParams({ tab: "reports", who: "ai" })).toEqual({ tab: "reports", filter: "ai" });
    expect(parseModerationParams({ tab: "nope", who: ["human", "ai"] })).toEqual({ tab: "held", filter: "human" });
  });
  it("keeps only characters a username or name search needs", () => {
    expect(userSearchTerm("  Sam_99%,or(role.eq.admin) ")).toBe("sam_99orroleeqadmin");
    expect(userSearchTerm(["Vice  City", "x"])).toBe("vice city");
    expect(userSearchTerm(undefined)).toBe("");
  });
});
