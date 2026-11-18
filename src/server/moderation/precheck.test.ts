import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompleteSession } from "@/server/auth/session";
import { DEFAULT_FLAGS, type Flags } from "@/server/flags";
import type { ModerationClient } from "./ai";

/** The pre-check orchestration (D-080): staff exemption, shadow hold, audit log and admin alerts. */
const logAiAction = vi.fn(async () => {});
const notifyAdmins = vi.fn(async () => {});

vi.mock("@/env", () => ({
  env: { ANTHROPIC_API_KEY: undefined, ANTHROPIC_MODEL_FAST: "claude-haiku-5-5" },
  integrations: { supabaseAdmin: true },
}));
vi.mock("@/server/admin/moderation", () => ({ logAiAction, notifyAdmins }));
vi.mock("@/server/admin/test-auth", () => ({ isTestIdentity: () => false }));
vi.mock("@/server/flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/flags")>()),
  getFlags: async () => DEFAULT_FLAGS,
}));

const { excerptOf, precheckContent, recordPrecheck } = await import("./precheck");

function session(overrides: Partial<CompleteSession["profile"]> = {}): CompleteSession {
  return {
    userId: "user-1",
    email: "member@example.com",
    profile: {
      id: "user-1",
      username: "member",
      displayName: null,
      avatarUrl: null,
      bio: null,
      platform: null,
      role: "user",
      reputation: 30,
      banned: false,
      bannedUntil: null,
      notifyEmailReplies: false,
      createdAt: "2026-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

function answering(labels: string[], action = "allow"): ModerationClient {
  return {
    messages: {
      parse: vi.fn(async () => ({ stop_reason: "end_turn", parsed_output: { action, labels, reason: "Checked." } })),
    },
  };
}

function deps(client: ModerationClient | null, flags: Partial<Flags> = {}) {
  return { client: () => client, model: () => "claude-haiku-5-5", flags: async () => ({ ...DEFAULT_FLAGS, ...flags }) };
}

const post = { kind: "post" as const, body: "Where are the camera settings?", spoilerTagged: false };

beforeEach(() => {
  logAiAction.mockClear();
  notifyAdmins.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("precheckContent", () => {
  it("doesn't check staff", async () => {
    const client = answering(["spam"], "reject");
    const result = await precheckContent({ ...post, session: session({ role: "mod" }) }, deps(client));
    expect(result).toMatchObject({ action: "allow", source: "staff", message: null });
    expect(client.messages.parse).not.toHaveBeenCalled();
  });

  it("passes the AI verdict through with a member message", async () => {
    const result = await precheckContent({ ...post, session: session() }, deps(answering(["leak"], "hold")));
    expect(result).toMatchObject({ action: "hold", labels: ["leak"], source: "ai", shadowHold: false });
    expect(result.message).toContain("waiting for a moderator");
  });

  it("falls back without a key: holds under 20 reputation", async () => {
    const result = await precheckContent({ ...post, session: session({ reputation: 4 }) }, deps(null));
    expect(result).toMatchObject({ action: "hold", source: "fallback", fallback: "no_key" });
  });

  it("shadow hold: holds a new account's allowed content when the flag is on", async () => {
    const fresh = session({ reputation: 0, createdAt: new Date().toISOString() });
    const on = await precheckContent({ ...post, session: fresh }, deps(answering([]), { SHADOW_HOLD_NEW_USERS: true }));
    expect(on).toMatchObject({ action: "hold", shadowHold: true, labels: ["new_account"] });
    const off = await precheckContent({ ...post, session: fresh }, deps(answering([])));
    expect(off.action).toBe("allow");
  });

  it("shadow hold leaves established accounts and clips alone", async () => {
    const established = await precheckContent(
      { ...post, session: session() },
      deps(answering([]), { SHADOW_HOLD_NEW_USERS: true }),
    );
    expect(established.action).toBe("allow");
    const clip = await precheckContent(
      { kind: "clip", title: "Jet ski", body: "lol", spoilerTagged: false, session: session({ reputation: 0 }) },
      deps(answering([]), { SHADOW_HOLD_NEW_USERS: true }),
    );
    expect(clip.action).toBe("allow");
  });
});

describe("recordPrecheck", () => {
  it("logs nothing for allowed or staff content", async () => {
    const allowed = await precheckContent({ ...post, session: session() }, deps(answering([])));
    await recordPrecheck(allowed, { targetId: 1, session: session(), excerpt: "x" });
    expect(logAiAction).not.toHaveBeenCalled();
  });

  it("logs a hold against the saved row, with labels and the member", async () => {
    const result = await precheckContent({ ...post, session: session() }, deps(answering(["harassment"], "hold")));
    await recordPrecheck(result, { targetId: 42, session: session(), excerpt: "Quoted" });
    expect(logAiAction).toHaveBeenCalledWith({
      action: "ai_hold",
      targetType: "post",
      targetId: 42,
      labels: ["harassment"],
      reason: "Checked.",
      subjectId: "user-1",
      excerpt: "Quoted",
    });
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it("logs a rejection with no row as 'none', and a shadow hold by name", async () => {
    const rejected = await precheckContent({ ...post, session: session() }, deps(answering(["spam"], "reject")));
    await recordPrecheck(rejected, { targetId: null, session: session(), excerpt: "Buy gold" });
    expect(logAiAction).toHaveBeenLastCalledWith(expect.objectContaining({ action: "ai_reject", targetId: "none" }));

    const fresh = session({ reputation: 0, createdAt: new Date().toISOString() });
    const shadow = await precheckContent(
      { ...post, session: fresh },
      deps(answering([]), { SHADOW_HOLD_NEW_USERS: true }),
    );
    await recordPrecheck(shadow, { targetId: 7, session: fresh, excerpt: "" });
    expect(logAiAction).toHaveBeenLastCalledWith(expect.objectContaining({ action: "shadow_hold", excerpt: null }));
  });

  it("a held bio is logged against the profile", async () => {
    const result = await precheckContent(
      { kind: "bio", body: "Bio: hi", spoilerTagged: false, session: session() },
      deps(answering(["harassment"], "hold")),
    );
    await recordPrecheck(result, { targetId: null, session: session(), excerpt: "hi" });
    expect(logAiAction).toHaveBeenCalledWith(expect.objectContaining({ targetType: "profile", targetId: "user-1" }));
  });

  it("self_harm alerts the admins (SPEC §8.2)", async () => {
    const result = await precheckContent({ ...post, session: session() }, deps(answering(["self_harm"], "hold")));
    expect(result.message).toContain("you don't have to deal with it alone");
    await recordPrecheck(result, { targetId: 9, session: session(), excerpt: "…" });
    expect(notifyAdmins).toHaveBeenCalledWith(expect.stringContaining("Possible self-harm in a reply by @member"));
  });
});

describe("excerptOf", () => {
  it("joins the parts as one short line", () => {
    expect(excerptOf("Title", null, "  body\n\ntext ")).toBe("Title · body text");
    expect(excerptOf("x".repeat(400))).toHaveLength(300);
  });
});
