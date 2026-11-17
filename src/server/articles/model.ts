import { z } from "zod";
import { ARTICLE_TYPES, type ArticleStatus, type ArticleType } from "@/config/articles";
import type { FactStatus, SpoilerLevel } from "@/config/tags";
import type { ArticleListItem } from "@/lib/articles/view";
import type { ArticleSource } from "@/lib/validation/article";
import type { Database } from "@/types/database";

/** Article view models (SPEC §4) and the mapping from database rows. Pure: no server imports. */

type Row = Database["public"]["Tables"]["articles"]["Row"];

export type Article = ArticleListItem & {
  status: ArticleStatus;
  bodyMd: string;
  coverImageUrl: string | null;
  sources: ArticleSource[];
  helpfulDown: number;
  pipelineRanAt: string | null;
};

export const LIST_COLUMNS =
  "id, type, slug, title, summary, tags, spoiler_level, fact_status, sources, helpful_up, published_at, updated_at";
export const DETAIL_COLUMNS = `${LIST_COLUMNS}, status, body_md, cover_image_url, helpful_down, pipeline_ran_at`;

const storedSource = z.object({
  title: z.string(),
  url: z.string(),
  accessed_at: z.string().default(""),
});

/** Sources as stored (jsonb); malformed entries are dropped rather than breaking the page. */
export function parseSources(value: unknown): ArticleSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = storedSource.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const asType = (value: string): ArticleType =>
  (ARTICLE_TYPES as readonly string[]).includes(value) ? (value as ArticleType) : "guide";

export function toListItem(
  row: Pick<
    Row,
    | "id"
    | "type"
    | "slug"
    | "title"
    | "summary"
    | "tags"
    | "spoiler_level"
    | "fact_status"
    | "sources"
    | "helpful_up"
    | "published_at"
    | "updated_at"
  >,
): ArticleListItem {
  const sources = parseSources(row.sources);
  return {
    id: row.id,
    type: asType(row.type),
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? "",
    tags: row.tags,
    spoilerLevel: (row.spoiler_level as SpoilerLevel) ?? "none",
    factStatus: (row.fact_status as FactStatus | null) ?? null,
    firstSourceUrl: sources[0]?.url ?? null,
    helpfulUp: row.helpful_up,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export function toArticle(
  row: Parameters<typeof toListItem>[0] &
    Pick<Row, "status" | "body_md" | "cover_image_url" | "helpful_down" | "pipeline_ran_at">,
): Article {
  return {
    ...toListItem(row),
    status: row.status as ArticleStatus,
    bodyMd: row.body_md,
    coverImageUrl: row.cover_image_url,
    sources: parseSources(row.sources),
    helpfulDown: row.helpful_down,
    pipelineRanAt: row.pipeline_ran_at,
  };
}

export type { ArticleListItem };
export { toFactSummary, toFeatureSummary, toTipSummary } from "@/lib/articles/view";
