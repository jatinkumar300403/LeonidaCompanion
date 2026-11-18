import { describe, expect, it } from "vitest";
import { actionText } from "./action-text";
import { labelName, MODERATION_LABELS, NEW_ACCOUNT_LABEL } from "./labels";
import { moderationMessage, SUPPORT_LINE } from "./messages";
import { cleanReason, decideAction, fallbackDecision, modelVerdictSchema, type ModelVerdict } from "./verdict";

const verdict = (labels: ModelVerdict["labels"], action: ModelVerdict["action"] = "allow"): ModelVerdict => ({
  action,
  labels,
  reason: "Because.",
});
const thread = { kind: "thread", spoilerTagged: false } as const;

describe("decideAction (SPEC §8.2 rules)", () => {
  it.each([
    ["spam", "reject"],
    ["hate", "reject"],
    ["sexual", "reject"],
    ["doxxing", "reject"],
    ["self_harm", "hold"],
    ["cheating_or_exploit", "hold"],
    ["leak", "hold"],
    ["harassment", "hold"],
    ["off_topic", "allow"],
  ] as const)("%s → %s", (label, action) => {
    expect(decideAction(verdict([label], "hold"), thread)).toMatchObject({ action, labels: [label], sendBack: false });
  });

  it("an untagged spoiler on its own is sent back to be tagged", () => {
    expect(decideAction(verdict(["untagged_spoiler"], "hold"), thread)).toMatchObject({
      action: "reject",
      sendBack: true,
    });
  });

  it("an untagged spoiler with another hold label is held", () => {
    expect(decideAction(verdict(["untagged_spoiler", "leak"], "hold"), thread)).toMatchObject({
      action: "hold",
      sendBack: false,
    });
  });

  it("an untagged spoiler on a clip is held (clips wait for a moderator anyway)", () => {
    expect(decideAction(verdict(["untagged_spoiler"]), { kind: "clip", spoilerTagged: false })).toMatchObject({
      action: "hold",
      sendBack: false,
    });
  });

  it("ignores untagged_spoiler when the content is already behind a spoiler tag", () => {
    expect(decideAction(verdict(["untagged_spoiler"], "hold"), { kind: "post", spoilerTagged: true })).toEqual({
      action: "allow",
      labels: [],
      reason: "Because.",
      sendBack: false,
    });
  });

  it("reject beats hold when labels mix", () => {
    expect(decideAction(verdict(["harassment", "hate"], "hold"), thread).action).toBe("reject");
  });

  it("the labels decide, not the model's action", () => {
    expect(decideAction(verdict(["spam"], "allow"), thread).action).toBe("reject");
    expect(decideAction(verdict(["off_topic"], "reject"), thread).action).toBe("allow");
  });

  it("a hold or reject with no label at all becomes a hold", () => {
    expect(decideAction(verdict([], "reject"), thread).action).toBe("hold");
    expect(decideAction(verdict([], "hold"), thread).action).toBe("hold");
    expect(decideAction(verdict([], "allow"), thread).action).toBe("allow");
  });

  it("drops duplicate labels", () => {
    expect(decideAction(verdict(["spam", "spam"]), thread).labels).toEqual(["spam"]);
  });
});

describe("fallbackDecision (SPEC §8.2: API failure)", () => {
  it("holds members under 20 reputation", () => {
    expect(fallbackDecision(19, "timeout")).toMatchObject({ action: "hold", labels: [] });
    expect(fallbackDecision(0, "no_key").reason).toContain("no API key");
  });
  it("allows members with 20 or more", () => {
    expect(fallbackDecision(20, "error")).toMatchObject({ action: "allow" });
  });
});

describe("modelVerdictSchema", () => {
  it("accepts the strict JSON shape", () => {
    expect(modelVerdictSchema.safeParse({ action: "allow", labels: [], reason: "ok" }).success).toBe(true);
  });
  it("refuses unknown labels and actions", () => {
    expect(modelVerdictSchema.safeParse({ action: "allow", labels: ["rude"], reason: "" }).success).toBe(false);
    expect(modelVerdictSchema.safeParse({ action: "block", labels: [], reason: "" }).success).toBe(false);
    expect(modelVerdictSchema.safeParse({ action: "allow", labels: [] }).success).toBe(false);
  });
});

describe("cleanReason", () => {
  it("collapses whitespace and caps the length", () => {
    expect(cleanReason("  a \n b  ")).toBe("a b");
    const long = cleanReason("x".repeat(500));
    expect(long).toHaveLength(200);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("moderationMessage", () => {
  it("says nothing for allowed content", () => {
    expect(moderationMessage("thread", { action: "allow", labels: [], sendBack: false })).toBeNull();
  });
  it("tells the author to add a spoiler tag and post again", () => {
    const text = moderationMessage("thread", { action: "reject", labels: ["untagged_spoiler"], sendBack: true });
    expect(text).toContain("Contains spoilers");
    expect(text).toContain("post again");
    expect(moderationMessage("post", { action: "reject", labels: ["untagged_spoiler"], sendBack: true })).toContain(
      "||double bars||",
    );
  });
  it("explains a rejection by its label", () => {
    expect(moderationMessage("post", { action: "reject", labels: ["spam"], sendBack: false })).toMatch(
      /reply wasn't posted because it looks like spam/,
    );
    expect(moderationMessage("bio", { action: "reject", labels: ["doxxing"], sendBack: false })).toMatch(
      /wasn't saved because it seems to share someone's private information/,
    );
  });
  it("says a held item waits for a moderator", () => {
    expect(moderationMessage("thread", { action: "hold", labels: ["leak"], sendBack: false })).toContain(
      "waiting for a moderator",
    );
    expect(moderationMessage("bio", { action: "hold", labels: [], sendBack: false })).toContain("wasn't saved");
  });
  it("adds the support line to a self-harm hold", () => {
    expect(moderationMessage("post", { action: "hold", labels: ["self_harm"], sendBack: false })).toContain(
      SUPPORT_LINE,
    );
  });
});

describe("labelName", () => {
  it("names every label", () => {
    for (const label of [...MODERATION_LABELS, NEW_ACCOUNT_LABEL]) {
      expect(labelName(label)).not.toContain("_");
    }
    expect(labelName("cheating_or_exploit")).toBe("Cheats / exploits");
  });
});

describe("actionText", () => {
  it("names audit-log actions", () => {
    expect(actionText("ai_hold", "post")).toBe("AI held a reply");
    expect(actionText("ai_reject", "profile")).toBe("AI refused a profile");
    expect(actionText("post_remove", "post")).toBe("Removed a reply");
    expect(actionText("clip_approve", "clip")).toBe("Approved a clip");
    expect(actionText("thread_lock", "thread")).toBe("Locked a thread");
    expect(actionText("thread_move", "thread")).toBe("Moved a thread");
    expect(actionText("ban", "profile")).toBe("Banned a profile");
    expect(actionText("flags_update", "site_settings")).toBe("Changed feature flags");
    expect(actionText("something_new", "widget")).toBe("something new");
  });
});
