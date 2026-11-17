import "server-only";
import { cache } from "react";
import type { Role } from "@/config/auth";
import { integrations } from "@/env";
import { USERNAME_PATTERN } from "@/config/auth";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  platform: string | null;
  role: Role;
  reputation: number;
  createdAt: string;
  stats: { threads: number; replies: number; clips: number };
};

/**
 * A public profile by username (SPEC §9), through RLS: only public columns, and counts of the
 * user's visible threads, replies and approved clips. null when it doesn't exist.
 */
export const getPublicProfile = cache(async (rawUsername: string): Promise<PublicProfile | null> => {
  const username = rawUsername.trim().toLowerCase();
  if (!integrations.supabase || !USERNAME_PATTERN.test(username)) return null;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, avatar_url, bio, platform, role, reputation, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile?.id || !profile.username) return null;

  const [threads, replies, clips] = await Promise.all([
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .in("status", ["open", "solved", "locked"]),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .eq("status", "visible")
      .eq("is_ai", false),
    supabase
      .from("clips")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", profile.id)
      .eq("status", "approved"),
  ]);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    platform: profile.platform,
    role: (profile.role ?? "user") as Role,
    reputation: profile.reputation ?? 0,
    createdAt: profile.created_at ?? new Date(0).toISOString(),
    stats: { threads: threads.count ?? 0, replies: replies.count ?? 0, clips: clips.count ?? 0 },
  };
});
