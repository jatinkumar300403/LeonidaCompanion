import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { FORUM_PAGE_SIZE, THREAD_POSTS_MAX } from "@/config/forum";
import { pageOffset, topWindowStart, unansweredCutoff, type ForumSort, type TopWindow } from "@/lib/forum/sort";
import { FORUM_TAG, threadTag } from "@/server/forum/cache-tags";
import {
  AUTHOR_COLUMNS,
  POST_COLUMNS,
  THREAD_DETAIL_COLUMNS,
  THREAD_LIST_COLUMNS,
  toAuthor,
  toThreadDetail,
  toThreadSummary,
  VISIBLE_THREAD_STATUSES,
  type ForumAuthor,
  type ForumCategory,
  type ForumThreadSummary,
  type ThreadDetail,
  type ThreadListRow,
} from "@/server/forum/model";
import { getPublicSupabase } from "@/server/supabase/public";
import type { Database } from "@/types/database";

/**
 * Forum reads (SPEC §5). Public reads run as `anon` through the cookie-less client, so RLS shows
 * exactly what a logged-out visitor may see, and are cached for 30 s under the "forum" and
 * "thread:<id>" tags (D-064). A database error logs and returns empty, so a page shows its empty
 * state rather than a 500.
 */
type Client = SupabaseClient<Database>;

// ─── Categories ─────────────────────────────────────────────────────────────
async function fetchCategories(): Promise<ForumCategory[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description, sort_order, is_qa, is_locked, spoilers_allowed, threads(count)")
    .order("sort_order");
  if (error) {
    console.error("[forum] categories failed:", error.code, error.message);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isQa: row.is_qa,
    isLocked: row.is_locked,
    spoilersAllowed: row.spoilers_allowed,
    threadCount: (row.threads as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export const getCategories = unstable_cache(fetchCategories, ["forum:categories"], {
  tags: [FORUM_TAG],
  revalidate: 60,
});

export async function getCategory(slug: string): Promise<ForumCategory | null> {
  return (await getCategories()).find((category) => category.slug === slug) ?? null;
}

export async function getCategoryById(id: number): Promise<ForumCategory | null> {
  return (await getCategories()).find((category) => category.id === id) ?? null;
}

// ─── Authors ────────────────────────────────────────────────────────────────
export async function loadAuthors(client: Client, ids: Iterable<string | null>): Promise<Map<string, ForumAuthor>> {
  const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
  const authors = new Map<string, ForumAuthor>();
  if (unique.length === 0) return authors;
  const { data, error } = await client.from("public_profiles").select(AUTHOR_COLUMNS).in("id", unique);
  if (error) {
    console.error("[forum] authors failed:", error.code, error.message);
    return authors;
  }
  for (const row of data) {
    const author = toAuthor(row);
    if (author) authors.set(author.id, author);
  }
  return authors;
}

// ─── Thread lists ───────────────────────────────────────────────────────────
export type ThreadListQuery = { categoryId: number | null; sort: ForumSort; t: TopWindow; page: number; size?: number };
export type ThreadListPage = { items: ForumThreadSummary[]; hasMore: boolean };

async function fetchThreadPage(
  categoryId: number | null,
  sort: ForumSort,
  t: TopWindow,
  page: number,
  size: number,
): Promise<ThreadListPage> {
  const supabase = getPublicSupabase();
  if (!supabase) return { items: [], hasMore: false };
  const offset = pageOffset(page, size);
  const categories = await getCategories();

  let rows: ThreadListRow[] = [];
  if (sort === "hot") {
    const { data, error } = await supabase.rpc("hot_threads", {
      p_category_id: categoryId ?? undefined,
      p_limit: size + 1,
      p_cursor: offset,
    });
    if (error) console.error("[forum] hot list failed:", error.code, error.message);
    rows = data ?? [];
  } else {
    let query = supabase.from("threads").select(THREAD_LIST_COLUMNS);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (sort === "unanswered") {
      // D-017: open, and no replies yet, or a Q&A thread still without an accepted answer after 24 h.
      const qaIds = categories.filter((category) => category.isQa).map((category) => category.id);
      query = query.eq("status", "open");
      query =
        qaIds.length > 0
          ? query.or(`reply_count.eq.0,and(category_id.in.(${qaIds.join(",")}),created_at.lt."${unansweredCutoff()}")`)
          : query.eq("reply_count", 0);
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.in("status", [...VISIBLE_THREAD_STATUSES]);
      if (sort === "top") {
        const since = topWindowStart(t);
        if (since) query = query.gte("created_at", since);
        query = query.order("score", { ascending: false }).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
    }
    const { data, error } = await query.order("id", { ascending: false }).range(offset, offset + size);
    if (error) console.error(`[forum] ${sort} list failed:`, error.code, error.message);
    rows = data ?? [];
  }

  const visible = rows.slice(0, size);
  const authors = await loadAuthors(
    supabase,
    visible.map((row) => row.author_id),
  );
  const byId = new Map(categories.map((category) => [category.id, category]));
  return {
    items: visible.map((row) =>
      toThreadSummary(row, byId.get(row.category_id), row.author_id ? (authors.get(row.author_id) ?? null) : null),
    ),
    hasMore: rows.length > size,
  };
}

export function listThreads(query: ThreadListQuery): Promise<ThreadListPage> {
  const size = Math.min(Math.max(query.size ?? FORUM_PAGE_SIZE, 1), 50);
  return unstable_cache(fetchThreadPage, ["forum:list"], { tags: [FORUM_TAG], revalidate: 30 })(
    query.categoryId,
    query.sort,
    query.t,
    query.page,
    size,
  );
}

/** Home page "Trending in the forum" (SPEC §3). */
export async function getHotThreads(limit: number): Promise<ForumThreadSummary[]> {
  return (await listThreads({ categoryId: null, sort: "hot", t: "week", page: 1, size: limit })).items;
}

/** A member's latest public threads (their profile page). */
export function getUserThreads(authorId: string, limit = 5): Promise<ForumThreadSummary[]> {
  return unstable_cache(
    async (id: string, max: number) => {
      const supabase = getPublicSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("threads")
        .select(THREAD_LIST_COLUMNS)
        .eq("author_id", id)
        .in("status", [...VISIBLE_THREAD_STATUSES])
        .order("created_at", { ascending: false })
        .limit(max);
      if (error) {
        console.error("[forum] user threads failed:", error.code, error.message);
        return [];
      }
      const [categories, authors] = await Promise.all([getCategories(), loadAuthors(supabase, [id])]);
      const byId = new Map(categories.map((category) => [category.id, category]));
      return data.map((row) => toThreadSummary(row, byId.get(row.category_id), authors.get(id) ?? null));
    },
    ["forum:user-threads"],
    { tags: [FORUM_TAG], revalidate: 60 },
  )(authorId, limit);
}

// ─── One thread ─────────────────────────────────────────────────────────────
/** A thread with its replies and authors, as `client` sees it (anon for the cache, the viewer otherwise). */
export async function fetchThread(client: Client, id: number): Promise<ThreadDetail | null> {
  const { data: thread, error } = await client.from("threads").select(THREAD_DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    console.error("[forum] thread failed:", error.code, error.message);
    return null;
  }
  if (!thread) return null;
  const { data: posts, error: postsError } = await client
    .from("posts")
    .select(POST_COLUMNS)
    .eq("thread_id", id)
    .order("created_at")
    .order("id")
    .limit(THREAD_POSTS_MAX);
  if (postsError) console.error("[forum] posts failed:", postsError.code, postsError.message);
  const rows = posts ?? [];
  const authors = await loadAuthors(client, [thread.author_id, ...rows.map((post) => post.author_id)]);
  return toThreadDetail(thread, rows, authors);
}

export function getThread(id: number): Promise<ThreadDetail | null> {
  return unstable_cache(
    async (threadId: number) => {
      const supabase = getPublicSupabase();
      return supabase ? fetchThread(supabase, threadId) : null;
    },
    ["forum:thread"],
    { tags: [threadTag(id)], revalidate: 30 },
  )(id);
}

// ─── Similar threads (/forum/new) ───────────────────────────────────────────
export type SimilarThread = { id: number; title: string; slug: string; status: string; replyCount: number };

export async function findSimilarThreads(query: string, limit = 5): Promise<SimilarThread[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("similar_threads", { p_query: query, p_limit: limit });
  if (error) {
    console.error("[forum] similar failed:", error.code, error.message);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    replyCount: row.reply_count,
  }));
}
