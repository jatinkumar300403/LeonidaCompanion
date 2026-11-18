import "server-only";
import type { Route } from "next";
import { threadHref } from "@/lib/notifications/format";
import type { ActionFilter } from "@/lib/validation/moderation";
import { getCategories, loadAuthors } from "@/server/forum/queries";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * The moderation queue's reads (SPEC §10). They run as the signed-in mod, so RLS decides: mods
 * read held and removed content, reports and the audit log ("Mods read …" policies). Callers
 * check requireRole("mod") first. Lists are capped; the queue is meant to be worked down.
 */
export type PersonRef = { id: string; username: string } | null;
export type AiNote = { action: string; labels: string[]; reason: string | null; at: string };

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const QUEUE_MAX = 50;

async function people(
  client: Client,
  ids: Iterable<string | null>,
): Promise<Map<string, { id: string; username: string }>> {
  const authors = await loadAuthors(client, ids);
  return new Map([...authors].map(([id, author]) => [id, { id, username: author.username }]));
}

async function categoryNames(): Promise<Map<number, string>> {
  return new Map((await getCategories()).map((category) => [category.id, category.name]));
}

/** Latest AI note per `type:id` target. */
async function aiNotes(client: Client, targets: { type: string; id: number | string }[]): Promise<Map<string, AiNote>> {
  const notes = new Map<string, AiNote>();
  if (targets.length === 0) return notes;
  const types = [...new Set(targets.map((target) => target.type))];
  const ids = [...new Set(targets.map((target) => String(target.id)))];
  const { data, error } = await client
    .from("moderation_actions")
    .select("target_type, target_id, action, labels, reason, created_at")
    .eq("actor_type", "ai")
    .in("target_type", types)
    .in("target_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[moderation] AI notes failed:", error.code, error.message);
    return notes;
  }
  for (const row of data) {
    const key = `${row.target_type}:${row.target_id}`;
    if (!notes.has(key)) {
      notes.set(key, { action: row.action, labels: row.labels, reason: row.reason, at: row.created_at });
    }
  }
  return notes;
}

// ─── Held ───────────────────────────────────────────────────────────────────
export type HeldItem = {
  key: string;
  kind: "thread" | "post";
  id: number;
  threadId: number;
  threadTitle: string;
  href: Route;
  categoryName: string | null;
  body: string;
  isSpoiler: boolean;
  author: PersonRef;
  createdAt: string;
  ai: AiNote | null;
};

/** Held threads and replies, oldest first, with the AI's labels and reason (SPEC §8.2). */
export async function listHeld(): Promise<HeldItem[]> {
  const supabase = await createSupabaseServerClient();
  const [threads, posts, categories] = await Promise.all([
    supabase
      .from("threads")
      .select("id, slug, title, body_md, author_id, category_id, is_spoiler, created_at")
      .eq("status", "held")
      .order("created_at", { ascending: true })
      .limit(QUEUE_MAX),
    supabase
      .from("posts")
      .select(
        "id, thread_id, body_md, author_id, created_at, thread:threads!posts_thread_id_fkey(slug, title, category_id, is_spoiler)",
      )
      .eq("status", "held")
      .order("created_at", { ascending: true })
      .limit(QUEUE_MAX),
    categoryNames(),
  ]);
  if (threads.error) console.error("[moderation] held threads failed:", threads.error.message);
  if (posts.error) console.error("[moderation] held posts failed:", posts.error.message);
  const threadRows = threads.data ?? [];
  const postRows = posts.data ?? [];

  const [authors, notes] = await Promise.all([
    people(supabase, [...threadRows.map((row) => row.author_id), ...postRows.map((row) => row.author_id)]),
    aiNotes(supabase, [
      ...threadRows.map((row) => ({ type: "thread", id: row.id })),
      ...postRows.map((row) => ({ type: "post", id: row.id })),
    ]),
  ]);

  const items: HeldItem[] = [
    ...threadRows.map((row) => ({
      key: `thread:${row.id}`,
      kind: "thread" as const,
      id: row.id,
      threadId: row.id,
      threadTitle: row.title,
      href: threadHref(row.id, row.slug),
      categoryName: categories.get(row.category_id) ?? null,
      body: row.body_md,
      isSpoiler: row.is_spoiler,
      author: (row.author_id && authors.get(row.author_id)) || null,
      createdAt: row.created_at,
      ai: notes.get(`thread:${row.id}`) ?? null,
    })),
    ...postRows.map((row) => ({
      key: `post:${row.id}`,
      kind: "post" as const,
      id: row.id,
      threadId: row.thread_id,
      threadTitle: row.thread?.title ?? "a thread",
      href: threadHref(row.thread_id, row.thread?.slug ?? null, row.id),
      categoryName: row.thread ? (categories.get(row.thread.category_id) ?? null) : null,
      body: row.body_md,
      isSpoiler: Boolean(row.thread?.is_spoiler),
      author: (row.author_id && authors.get(row.author_id)) || null,
      createdAt: row.created_at,
      ai: notes.get(`post:${row.id}`) ?? null,
    })),
  ];
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, QUEUE_MAX);
}

// ─── Reports ────────────────────────────────────────────────────────────────
export type ReportTargetView = {
  title: string;
  body: string | null;
  href: Route | null;
  status: string | null;
  author: PersonRef;
  isSpoiler: boolean;
  categoryId: number | null;
};

export type ReportGroup = {
  key: string;
  targetType: string;
  targetId: string;
  count: number;
  reasons: string[];
  details: string[];
  firstAt: string;
  target: ReportTargetView | null;
};

const numericIds = (ids: string[]) => ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Open reports grouped by what they point at, oldest first, with a preview of the target. */
export async function listOpenReports(): Promise<ReportGroup[]> {
  const supabase = await createSupabaseServerClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) {
    console.error("[moderation] reports failed:", error.code, error.message);
    return [];
  }

  const groups = new Map<string, ReportGroup>();
  for (const report of reports) {
    const key = `${report.target_type}:${report.target_id}`;
    const group = groups.get(key) ?? {
      key,
      targetType: report.target_type,
      targetId: report.target_id,
      count: 0,
      reasons: [],
      details: [],
      firstAt: report.created_at,
      target: null,
    };
    group.count += 1;
    if (!group.reasons.includes(report.reason)) group.reasons.push(report.reason);
    if (report.details?.trim() && group.details.length < 3) group.details.push(report.details.trim());
    groups.set(key, group);
  }
  const list = [...groups.values()].slice(0, QUEUE_MAX);
  const idsOf = (type: string) => list.filter((group) => group.targetType === type).map((group) => group.targetId);

  const threadIds = numericIds(idsOf("thread"));
  const postIds = numericIds(idsOf("post"));
  const clipIds = numericIds(idsOf("clip"));
  const profileIds = idsOf("profile").filter((id) => UUID.test(id));

  const [threads, posts, clips, profiles] = await Promise.all([
    threadIds.length
      ? supabase
          .from("threads")
          .select("id, slug, title, body_md, author_id, status, category_id, is_spoiler")
          .in("id", threadIds)
      : null,
    postIds.length
      ? supabase
          .from("posts")
          .select(
            "id, thread_id, body_md, author_id, status, thread:threads!posts_thread_id_fkey(slug, title, is_spoiler, category_id)",
          )
          .in("id", postIds)
      : null,
    clipIds.length ? supabase.from("clips").select("id, title, caption, submitted_by, status").in("id", clipIds) : null,
    profileIds.length
      ? supabase.from("public_profiles").select("id, username, display_name, bio").in("id", profileIds)
      : null,
  ]);

  const authors = await people(supabase, [
    ...(threads?.data ?? []).map((row) => row.author_id),
    ...(posts?.data ?? []).map((row) => row.author_id),
    ...(clips?.data ?? []).map((row) => row.submitted_by),
  ]);
  const author = (id: string | null) => (id && authors.get(id)) || null;

  const targets = new Map<string, ReportTargetView>();
  for (const row of threads?.data ?? []) {
    targets.set(`thread:${row.id}`, {
      title: row.title,
      body: row.body_md,
      href: threadHref(row.id, row.slug),
      status: row.status,
      author: author(row.author_id),
      isSpoiler: row.is_spoiler,
      categoryId: row.category_id,
    });
  }
  for (const row of posts?.data ?? []) {
    targets.set(`post:${row.id}`, {
      title: `Reply in “${row.thread?.title ?? "a thread"}”`,
      body: row.body_md,
      href: threadHref(row.thread_id, row.thread?.slug ?? null, row.id),
      status: row.status,
      author: author(row.author_id),
      isSpoiler: Boolean(row.thread?.is_spoiler),
      categoryId: null,
    });
  }
  for (const row of clips?.data ?? []) {
    targets.set(`clip:${row.id}`, {
      title: row.title,
      body: row.caption,
      href: row.status === "approved" ? (`/clips/${row.id}` as Route) : ("/admin/clips" as Route),
      status: row.status,
      author: author(row.submitted_by),
      isSpoiler: false,
      categoryId: null,
    });
  }
  for (const row of profiles?.data ?? []) {
    if (!row.id || !row.username) continue;
    targets.set(`profile:${row.id}`, {
      title: `@${row.username}${row.display_name ? ` (${row.display_name})` : ""}`,
      body: row.bio,
      href: `/admin/users/${row.id}` as Route,
      status: null,
      author: { id: row.id, username: row.username },
      isSpoiler: false,
      categoryId: null,
    });
  }
  for (const group of list) group.target = targets.get(group.key) ?? null;
  return list;
}

// ─── Recent actions (audit log) ─────────────────────────────────────────────
export type ActionRow = {
  id: number;
  at: string;
  actorType: "human" | "ai";
  actor: PersonRef;
  action: string;
  targetType: string;
  targetId: string;
  labels: string[];
  reason: string | null;
  excerpt: string | null;
  subject: PersonRef;
  href: Route | null;
};

export async function listRecentActions(
  options: { filter?: ActionFilter; subjectId?: string; limit?: number } = {},
): Promise<ActionRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("moderation_actions")
    .select("id, created_at, actor_id, actor_type, action, target_type, target_id, labels, reason, excerpt, subject_id")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? QUEUE_MAX);
  if (options.filter === "human" || options.filter === "ai") query = query.eq("actor_type", options.filter);
  if (options.subjectId) query = query.eq("subject_id", options.subjectId);
  const { data, error } = await query;
  if (error) {
    console.error("[moderation] audit log failed:", error.code, error.message);
    return [];
  }

  const postIds = numericIds(data.filter((row) => row.target_type === "post").map((row) => row.target_id));
  const [authors, posts] = await Promise.all([
    people(
      supabase,
      data.flatMap((row) => [row.actor_id, row.subject_id]),
    ),
    postIds.length ? supabase.from("posts").select("id, thread_id").in("id", postIds) : null,
  ]);
  const postThread = new Map((posts?.data ?? []).map((row) => [row.id, row.thread_id]));

  return data.map((row) => {
    const id = Number(row.target_id);
    let href: Route | null = null;
    if (row.target_type === "thread" && id > 0) href = threadHref(id, null);
    else if (row.target_type === "post" && postThread.has(id)) href = threadHref(postThread.get(id)!, null, id);
    else if (row.target_type === "clip" && id > 0) href = "/admin/clips" as Route;
    else if (row.target_type === "profile" && UUID.test(row.target_id)) href = `/admin/users/${row.target_id}` as Route;
    return {
      id: row.id,
      at: row.created_at,
      actorType: row.actor_type === "ai" ? "ai" : "human",
      actor: (row.actor_id && authors.get(row.actor_id)) || null,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      labels: row.labels,
      reason: row.reason,
      excerpt: row.excerpt,
      subject: (row.subject_id && authors.get(row.subject_id)) || null,
      href,
    };
  });
}

/** Counts for the tab labels. */
export async function queueCounts(): Promise<{ held: number; reports: number }> {
  const supabase = await createSupabaseServerClient();
  const head = { count: "exact", head: true } as const;
  const [threads, posts, reports] = await Promise.all([
    supabase.from("threads").select("id", head).eq("status", "held"),
    supabase.from("posts").select("id", head).eq("status", "held"),
    supabase.from("reports").select("id", head).eq("status", "open"),
  ]);
  return { held: (threads.count ?? 0) + (posts.count ?? 0), reports: reports.count ?? 0 };
}
