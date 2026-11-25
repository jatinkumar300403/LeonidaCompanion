import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 10 (D-102): Settings actions answer bad input with a message instead of throwing, and
 * removing an avatar is rate-limited like uploading one.
 */
const rateLimit = vi.fn(async () => ({ success: true, retryAfterSeconds: 0 }));
const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
const deleteUserAccount = vi.fn(async () => {});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/env.client", () => ({ publicEnv: { supabaseUrl: "https://dev.supabase.co" } }));
vi.mock("@/lib/ratelimit/limit", () => ({ rateLimit, rateLimitMessage: () => "Too many attempts." }));
vi.mock("@/server/admin/account", () => ({ deleteUserAccount }));
vi.mock("@/server/auth/session", () => ({
  requireUser: async () => ({
    userId: "user-1",
    email: "member@example.com",
    profile: { id: "user-1", username: "member", avatarUrl: null, banned: false, role: "user" },
  }),
}));
vi.mock("@/server/flags", () => ({
  getFlags: async () => ({}),
  MAINTENANCE_MESSAGE: "",
  writesPausedFor: () => false,
}));
vi.mock("@/server/moderation/precheck", () => ({}));
vi.mock("@/server/profiles/avatar", () => ({
  AvatarError: Error,
  avatarPathFromUrl: () => null,
  processAvatar: vi.fn(),
}));
vi.mock("@/server/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({ update }),
    storage: { from: () => ({ remove: vi.fn() }) },
  }),
}));

const { deleteAccount, removeAvatar, updateNotificationPrefs } = await import("./actions");

const form = (entries: Record<string, string | Blob>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Settings actions with crafted input", () => {
  it("notification prefs: an unexpected value is an error message, not a crash", async () => {
    const result = await updateNotificationPrefs({ status: "idle" }, form({ notifyEmailReplies: "maybe" }));
    expect(result).toMatchObject({ status: "error" });
    expect(update).not.toHaveBeenCalled();
  });

  it("notification prefs: a ticked box still saves", async () => {
    const result = await updateNotificationPrefs({ status: "idle" }, form({ notifyEmailReplies: "on" }));
    expect(result).toMatchObject({ status: "saved" });
    expect(update).toHaveBeenCalledWith({ notify_email_replies: true });
  });

  it("delete account: a file instead of the username is refused without deleting", async () => {
    const result = await deleteAccount({ status: "idle" }, form({ confirmUsername: new Blob(["member"]) }));
    expect(result).toMatchObject({ status: "error" });
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it("delete account: an odd removePosts value is refused without deleting", async () => {
    const result = await deleteAccount({ status: "idle" }, form({ confirmUsername: "member", removePosts: "yes!" }));
    expect(result).toMatchObject({ status: "error" });
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it("remove avatar is rate-limited", async () => {
    rateLimit.mockResolvedValueOnce({ success: false, retryAfterSeconds: 60 });
    const result = await removeAvatar();
    expect(result).toEqual({ status: "error", message: "Too many attempts." });
    expect(rateLimit).toHaveBeenCalledWith("avatarUpload", "user-1");
    expect(update).not.toHaveBeenCalled();
  });
});
