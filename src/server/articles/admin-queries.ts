import "server-only";
import { ARTICLE_STATUSES, ARTICLE_TYPES, type ArticleStatus, type ArticleType } from "@/config/articles";
import { DETAIL_COLUMNS, toArticle, type Article } from "@/server/articles/model";
import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Admin reads (SPEC §10 Articles). They run as the signed-in staff member: RLS lets mods and
 * admins see drafts, review, scheduled and archived articles. Never cached.
 */

export type AdminArticleFilter = { type?: string; status?: string; q?: string; page?: number };

export type AdminArticleRow = {
  id: string;
  type: ArticleType;
  slug: string;
  title: string;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
  spoilerLevel: string;
  helpfulUp: number;
};

export const ADMIN_PAGE_SIZE = 25;

export function normalizeAdminFilter(input: Record<string, string | string[] | undefined>) {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const type = one(input.type);
  const status = one(input.status);
  const page = Number.parseInt(one(input.page), 10);
  return {
    type: (ARTICLE_TYPES as readonly string[]).includes(type) ? (type as ArticleType) : undefined,
    status: (ARTICLE_STATUSES as readonly string[]).includes(status) ? (status as ArticleStatus) : undefined,
    q: one(input.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

export async function listAdminArticles(filter: ReturnType<typeof normalizeAdminFilter>) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("articles")
    .select("id, type, slug, title, status, published_at, updated_at, spoiler_level, helpful_up", { count: "exact" });
  if (filter.type) query = query.eq("type", filter.type);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.q) query = query.ilike("title", `%${filter.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const from = (filter.page - 1) * ADMIN_PAGE_SIZE;
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) {
    console.error("[admin] article list failed:", error.code, error.message);
    return { rows: [] as AdminArticleRow[], total: 0 };
  }
  const rows: AdminArticleRow[] = data.map((row) => ({
    id: row.id,
    type: row.type as ArticleType,
    slug: row.slug,
    title: row.title,
    status: row.status as ArticleStatus,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    spoilerLevel: row.spoiler_level,
    helpfulUp: row.helpful_up,
  }));
  return { rows, total: count ?? rows.length };
}

export async function getAdminArticle(id: string): Promise<Article | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("articles").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    console.error("[admin] article read failed:", error.code, error.message);
    return null;
  }
  return data ? toArticle(data) : null;
}

/** Slugs of this type that start with `base` (for picking a free one). */
export async function takenSlugs(type: ArticleType, base: string, excludeId?: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("articles").select("id, slug").eq("type", type).like("slug", `${base}%`).limit(1000);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return (data ?? []).map((row) => row.slug);
}
