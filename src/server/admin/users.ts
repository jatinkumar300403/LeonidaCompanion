import "server-only";
import type { Role } from "@/config/auth";
import { isBanActive } from "@/lib/auth/paths";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * /admin/users reads (SPEC §10 "search, view, change role, ban/unban"). Ban state isn't readable as
 * a member (column grants, D-039), so these use the service role. Callers check
 * requireRole("mod") first. No emails are read or shown (D-084).
 */
export type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  role: Role;
  reputation: number;
  createdAt: string;
  banned: boolean;
  bannedUntil: string | null;
};

const COLUMNS = "id, username, display_name, bio, role, reputation, created_at, is_banned, banned_until";

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  role: string;
  reputation: number;
  created_at: string;
  is_banned: boolean;
  banned_until: string | null;
};

function toUser(row: Row): AdminUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    role: row.role as Role,
    reputation: row.reputation,
    createdAt: row.created_at,
    banned: isBanActive(row.is_banned, row.banned_until),
    bannedUntil: row.banned_until,
  };
}

/**
 * Newest first. `term` comes from userSearchTerm() (letters, digits, underscores, spaces only), so
 * it is safe inside a PostgREST `or` filter.
 */
export async function searchUsers(options: {
  term: string;
  bannedOnly: boolean;
  limit?: number;
}): Promise<AdminUser[]> {
  let query = getAdminSupabase()
    .from("profiles")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 40);
  if (options.term) {
    const like = `%${options.term.replace(/_/g, "\\_")}%`;
    query = query.or(`username.ilike.${like},display_name.ilike.${like}`);
  }
  if (options.bannedOnly) query = query.eq("is_banned", true);
  const { data, error } = await query;
  if (error) {
    console.error("[admin/users] search failed:", error.code, error.message);
    return [];
  }
  const users = (data as Row[]).map(toUser);
  return options.bannedOnly ? users.filter((user) => user.banned) : users;
}

export type UserActivity = {
  user: AdminUser;
  counts: { threads: number; posts: number; clips: number; reportsFiled: number; reportsAgainst: number };
  threads: { id: number; slug: string; title: string; status: string; createdAt: string }[];
  posts: { id: number; threadId: number; excerpt: string; status: string; createdAt: string }[];
  clips: { id: number; title: string; status: string; createdAt: string }[];
};

export async function getUserActivity(id: string): Promise<UserActivity | null> {
  const admin = getAdminSupabase();
  const { data: row, error } = await admin.from("profiles").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) console.error("[admin/users] profile failed:", error.code, error.message);
  if (!row) return null;

  const head = { count: "exact", head: true } as const;
  const count = async (promise: PromiseLike<{ count: number | null }>) => (await promise).count ?? 0;
  const [threadCount, postCount, clipCount, filed, against, threads, posts, clips] = await Promise.all([
    count(admin.from("threads").select("id", head).eq("author_id", id)),
    count(admin.from("posts").select("id", head).eq("author_id", id).eq("is_ai", false)),
    count(admin.from("clips").select("id", head).eq("submitted_by", id)),
    count(admin.from("reports").select("id", head).eq("reporter_id", id)),
    count(admin.from("reports").select("id", head).eq("target_type", "profile").eq("target_id", id)),
    admin
      .from("threads")
      .select("id, slug, title, status, created_at")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("posts")
      .select("id, thread_id, body_md, status, created_at")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("clips")
      .select("id, title, status, created_at")
      .eq("submitted_by", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    user: toUser(row as Row),
    counts: { threads: threadCount, posts: postCount, clips: clipCount, reportsFiled: filed, reportsAgainst: against },
    threads: (threads.data ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      status: t.status,
      createdAt: t.created_at,
    })),
    posts: (posts.data ?? []).map((p) => ({
      id: p.id,
      threadId: p.thread_id,
      excerpt: p.body_md.replace(/\s+/g, " ").slice(0, 140),
      status: p.status,
      createdAt: p.created_at,
    })),
    clips: (clips.data ?? []).map((c) => ({ id: c.id, title: c.title, status: c.status, createdAt: c.created_at })),
  };
}
