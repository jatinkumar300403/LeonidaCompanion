import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/config/auth";
import { integrations } from "@/env";
import { hasRole, isBanActive } from "@/lib/auth/paths";
import { onboardingPath, signInPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type SessionProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  platform: string | null;
  role: Role;
  reputation: number;
  banned: boolean;
  bannedUntil: string | null;
  notifyEmailReplies: boolean;
  createdAt: string;
};

export type Session = {
  userId: string;
  email: string | null;
  /** null until the user finishes onboarding. */
  profile: SessionProfile | null;
};

type MyProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  platform: string | null;
  role: Role;
  reputation: number;
  is_banned: boolean;
  banned_until: string | null;
  notify_email_replies: boolean;
  created_at: string;
};

function toProfile(row: MyProfileRow): SessionProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    platform: row.platform,
    role: row.role,
    reputation: row.reputation,
    banned: isBanActive(row.is_banned, row.banned_until),
    bannedUntil: row.banned_until,
    notifyEmailReplies: row.notify_email_replies,
    createdAt: row.created_at,
  };
}

/**
 * The signed-in user for this request (cached per render). Verifies the JWT with getClaims(),
 * never trusting getSession() on the server, then loads the user's own profile row.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!integrations.supabase) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: rows } = await supabase.rpc("get_my_profile");
  const row = (Array.isArray(rows) ? rows[0] : rows) as MyProfileRow | undefined;
  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile: row ? toProfile(row) : null,
  };
});

export type CompleteSession = Session & { profile: SessionProfile };

/** Signed-in users only; sends everyone else to /sign-in, and unfinished accounts to /onboarding. */
export async function requireUser(next: string): Promise<CompleteSession>;
export async function requireUser(next: string, options: { allowIncomplete: true }): Promise<Session>;
export async function requireUser(next: string, options?: { allowIncomplete?: boolean }): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(signInPath(next));
  if (!session.profile && !options?.allowIncomplete) redirect(onboardingPath(next));
  return session;
}

/** Staff-only pages. Anyone below the role gets a plain 404, so admin URLs stay unannounced. */
export async function requireRole(role: Exclude<Role, "user">, next: string): Promise<CompleteSession> {
  const session = await requireUser(next);
  if (session.profile.banned || !hasRole(session.profile.role, role)) notFound();
  return session;
}
