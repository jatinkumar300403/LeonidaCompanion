"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { publicEnv } from "@/env.client";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { routes } from "@/lib/routes";
import {
  deleteAccountSchema,
  fieldErrors,
  notificationPrefsSchema,
  profileUpdateSchema,
} from "@/lib/validation/profile";
import { deleteUserAccount } from "@/server/admin/account";
import { requireUser } from "@/server/auth/session";
import { getFlags, MAINTENANCE_MESSAGE, writesPausedFor } from "@/server/flags";
import { excerptOf, precheckContent, recordPrecheck } from "@/server/moderation/precheck";
import { AvatarError, avatarPathFromUrl, processAvatar } from "@/server/profiles/avatar";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type SettingsState =
  | { status: "idle" }
  | { status: "saved"; message: string; at: number }
  | { status: "deleted" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const BANNED_MESSAGE = "Your account is suspended, so you can't change your profile right now.";

function savedState(message: string): SettingsState {
  return { status: "saved", message, at: Date.now() };
}

/** Display name, bio and platform. Updates run as the user (RLS + column grants). */
export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await requireUser("/settings");
  const limit = await rateLimit("profileUpdate", session.userId);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };

  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
    platform: formData.get("platform") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (writesPausedFor(await getFlags(), session.profile.role)) return { status: "error", message: MAINTENANCE_MESSAGE };

  // AI pre-check of the public profile text (SPEC §8.2). Per D-016 a held or rejected bio isn't
  // saved: the member is told why, and self_harm also alerts the admins.
  const { displayName, bio } = parsed.data;
  const changed =
    (displayName ?? null) !== (session.profile.displayName ?? null) || (bio ?? null) !== (session.profile.bio ?? null);
  if (changed && (displayName || bio)) {
    const precheck = await precheckContent({
      kind: "bio",
      body: [displayName ? `Display name: ${displayName}` : null, bio ? `Bio: ${bio}` : null]
        .filter(Boolean)
        .join("\n"),
      spoilerTagged: false,
      session,
    });
    if (precheck.action !== "allow") {
      after(() => recordPrecheck(precheck, { targetId: null, session, excerpt: excerptOf(displayName, bio) }));
      return { status: "error", message: precheck.message ?? "We couldn't save your profile. Please try again." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, bio: parsed.data.bio, platform: parsed.data.platform })
    .eq("id", session.userId);
  if (error) {
    if (error.message.includes("account_banned")) return { status: "error", message: BANNED_MESSAGE };
    console.error("[settings] profile update failed:", error.code, error.message);
    return { status: "error", message: "We couldn't save your profile. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath(routes.user(session.profile.username));
  return savedState("Profile saved.");
}

export async function updateNotificationPrefs(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await requireUser("/settings");
  const limit = await rateLimit("profileUpdate", session.userId);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };

  const parsed = notificationPrefsSchema.parse({ notifyEmailReplies: formData.get("notifyEmailReplies") ?? undefined });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notify_email_replies: parsed.notifyEmailReplies })
    .eq("id", session.userId);
  if (error) return { status: "error", message: "We couldn't save that. Please try again." };

  revalidatePath("/settings");
  return savedState("Notification settings saved.");
}

/**
 * Saves a new avatar: the browser crops it to a square, the server re-encodes it with sharp and
 * uploads it to avatars/<user id>/ as the user (storage RLS), then removes the previous file.
 */
export async function uploadAvatar(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await requireUser("/settings");
  if (session.profile.banned) return { status: "error", message: BANNED_MESSAGE };
  const limit = await rateLimit("avatarUpload", session.userId);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { status: "error", message: "Choose an image first." };

  let webp: Buffer;
  try {
    webp = await processAvatar(file);
  } catch (error) {
    return { status: "error", message: error instanceof AvatarError ? error.message : "That image didn't work." };
  }

  const supabase = await createSupabaseServerClient();
  const path = `${session.userId}/${crypto.randomUUID()}.webp`;
  const upload = await supabase.storage
    .from("avatars")
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("[settings] avatar upload failed:", upload.error.message);
    return { status: "error", message: "We couldn't upload the image. Please try again." };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", session.userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return { status: "error", message: "We couldn't save the image. Please try again." };
  }

  const oldPath = avatarPathFromUrl(session.profile.avatarUrl, publicEnv.supabaseUrl);
  if (oldPath && oldPath.startsWith(`${session.userId}/`)) await supabase.storage.from("avatars").remove([oldPath]);

  revalidatePath("/settings");
  revalidatePath(routes.user(session.profile.username));
  return savedState("Photo updated.");
}

export async function removeAvatar(): Promise<SettingsState> {
  const session = await requireUser("/settings");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.userId);
  if (error) return { status: "error", message: "We couldn't remove the photo. Please try again." };

  const oldPath = avatarPathFromUrl(session.profile.avatarUrl, publicEnv.supabaseUrl);
  if (oldPath && oldPath.startsWith(`${session.userId}/`)) await supabase.storage.from("avatars").remove([oldPath]);

  revalidatePath("/settings");
  revalidatePath(routes.user(session.profile.username));
  return savedState("Photo removed.");
}

/** SPEC §9 delete account: typed confirmation, optional "[deleted]" bodies, then a hard delete. */
export async function deleteAccount(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await requireUser("/settings");
  const limit = await rateLimit("deleteAccount", session.userId);
  if (!limit.success) return { status: "error", message: rateLimitMessage(limit.retryAfterSeconds) };

  const parsed = deleteAccountSchema.parse({
    confirmUsername: formData.get("confirmUsername") ?? "",
    removePosts: formData.get("removePosts") ?? undefined,
  });
  if (parsed.confirmUsername !== session.profile.username) {
    return {
      status: "error",
      message: "Type your username exactly to confirm.",
      fieldErrors: { confirmUsername: `Type ${session.profile.username} to confirm.` },
    };
  }

  try {
    await deleteUserAccount(session.userId, { removePosts: parsed.removePosts });
  } catch (error) {
    console.error("[settings] account deletion failed:", error);
    return { status: "error", message: "We couldn't delete your account. Please try again or contact us." };
  }

  // The auth user is gone. No cookie changes here: they would re-render /settings mid-way. The
  // browser clears its session, leaves the flash message and reloads (DeleteAccount); the proxy
  // drops the onboarding hint.
  return { status: "deleted" };
}
