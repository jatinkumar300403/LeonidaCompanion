import "server-only";
import { unstable_cache } from "next/cache";
import { PAGE_SIZE, type ArticleType } from "@/config/articles";
import { cursorFilter, decodeCursor, encodeCursor, type ArticleSort } from "@/lib/articles/cursor";
import { rankRelated } from "@/lib/articles/content";
import { ARTICLES_TAG, articleTag, typeTag } from "@/server/articles/cache-tags";
import {
  DETAIL_COLUMNS,
  LIST_COLUMNS,
  toArticle,
  toListItem,
  type Article,
  type ArticleListItem,
} from "@/server/articles/model";
import { getPublicSupabase } from "@/server/supabase/public";

/**
 * Public article reads (SPEC §4). They run as `anon` through the cookie-less client, so RLS
 * returns only published articles whose published_at has passed, and are cached under tags that
 * the publish pipeline invalidates (D-005). A database error logs and returns empty: a public page
 * shows its empty state rather than a 500.
 */

export type ArticleListQuery = {
  type: ArticleType;
  tag?: string | null;
  spoilerFree?: boolean;
  sort?: ArticleSort;
  cursor?: string | null;
  limit?: number;
};

export type ArticlePage = { items: ArticleListItem[]; nextCursor: string | null };

async function fetchArticlePage({
  type,
  tag = null,
  spoilerFree = true,
  sort = "latest",
  cursor = null,
  limit = PAGE_SIZE,
}: ArticleListQuery): Promise<ArticlePage> {
  const supabase = getPublicSupabase();
  if (!supabase) return { items: [], nextCursor: null };

  let query = supabase.from("articles").select(LIST_COLUMNS).eq("type", type).eq("status", "published");
  if (tag) query = query.contains("tags", [tag]);
  if (spoilerFree) query = query.eq("spoiler_level", "none");
  const after = decodeCursor(cursor, sort);
  if (after) query = query.or(cursorFilter(after));
  if (sort === "helpful") query = query.order("helpful_up", { ascending: false });
  query = query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error("[articles] list failed:", error.code, error.message);
    return { items: [], nextCursor: null };
  }
  const rows = data.map(toListItem);
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const nextCursor =
    rows.length > limit && last?.publishedAt
      ? encodeCursor(
          sort === "helpful"
            ? { sort, helpfulUp: last.helpfulUp, publishedAt: last.publishedAt, id: last.id }
            : { sort, publishedAt: last.publishedAt, id: last.id },
        )
      : null;
  return { items, nextCursor };
}

export function listArticles(query: ArticleListQuery): Promise<ArticlePage> {
  const normalized = {
    type: query.type,
    tag: query.tag ?? null,
    spoilerFree: query.spoilerFree ?? true,
    sort: query.sort ?? "latest",
    cursor: query.cursor ?? null,
    limit: Math.min(Math.max(query.limit ?? PAGE_SIZE, 1), 48),
  };
  return unstable_cache(fetchArticlePage, ["articles:list"], {
    tags: [ARTICLES_TAG, typeTag(query.type)],
    revalidate: 600,
  })(normalized);
}

/** Newest published articles of a type, spoiler-free (home page blocks). */
export async function getLatestArticles(type: ArticleType, limit: number): Promise<ArticleListItem[]> {
  return (await listArticles({ type, limit, spoilerFree: true })).items;
}

async function fetchArticle(type: ArticleType, slug: string): Promise<Article | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select(DETAIL_COLUMNS)
    .eq("type", type)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("[articles] get failed:", error.code, error.message);
    return null;
  }
  return data ? toArticle(data) : null;
}

export function getArticle(type: ArticleType, slug: string): Promise<Article | null> {
  return unstable_cache(fetchArticle, ["articles:one"], {
    tags: [ARTICLES_TAG, typeTag(type), articleTag(type, slug)],
    revalidate: 600,
  })(type, slug);
}

/** The newest published launch article (SPEC §4: /launch shows a single launch article). */
export function getLaunchArticle(): Promise<Article | null> {
  return unstable_cache(
    async () => {
      const supabase = getPublicSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("articles")
        .select(DETAIL_COLUMNS)
        .eq("type", "launch")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error("[articles] launch article failed:", error.code, error.message);
      return data ? toArticle(data) : null;
    },
    ["articles:launch"],
    { tags: [ARTICLES_TAG, typeTag("launch")], revalidate: 600 },
  )();
}

/**
 * Related articles (SPEC §4): same type, most shared tags first. Embedding similarity joins in
 * Phase 7 once articles are embedded.
 */
export function getRelatedArticles(article: Pick<Article, "id" | "type" | "tags">, limit = 3) {
  return unstable_cache(
    async (type: ArticleType, id: string, tags: string[], max: number): Promise<ArticleListItem[]> => {
      const supabase = getPublicSupabase();
      if (!supabase || tags.length === 0) return [];
      const { data, error } = await supabase
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("type", type)
        .eq("status", "published")
        .eq("spoiler_level", "none")
        .overlaps("tags", tags)
        .neq("id", id)
        .order("published_at", { ascending: false })
        .limit(24);
      if (error) {
        console.error("[articles] related failed:", error.code, error.message);
        return [];
      }
      return rankRelated(tags, data.map(toListItem), { excludeId: id, limit: max });
    },
    ["articles:related"],
    { tags: [ARTICLES_TAG, typeTag(article.type)], revalidate: 600 },
  )(article.type, article.id, article.tags, limit);
}
