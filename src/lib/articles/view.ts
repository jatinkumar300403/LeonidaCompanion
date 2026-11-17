import type { ArticleType } from "@/config/articles";
import type { FactStatus, SpoilerLevel } from "@/config/tags";
import { featureIconFor } from "@/lib/articles/content";
import type { FactSummary, FeatureSummary, TipSummary } from "@/types/content";

/**
 * The article shape lists and cards use, and its mapping onto the card view models. Kept free of
 * zod and server code so client components (LoadMore) can import it.
 */
export type ArticleListItem = {
  id: string;
  type: ArticleType;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  spoilerLevel: SpoilerLevel;
  factStatus: FactStatus | null;
  firstSourceUrl: string | null;
  helpfulUp: number;
  publishedAt: string | null;
  updatedAt: string;
};

export function toTipSummary(item: ArticleListItem): TipSummary {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    helpfulCount: item.helpfulUp,
    spoilerLevel: item.spoilerLevel,
    publishedAt: item.publishedAt ?? item.updatedAt,
  };
}

export function toFeatureSummary(item: ArticleListItem): FeatureSummary {
  return { id: item.id, slug: item.slug, title: item.title, summary: item.summary, icon: featureIconFor(item.tags) };
}

/** A fact card shows the title as the fact sentence; a fact without a status counts as community. */
export function toFactSummary(item: ArticleListItem): FactSummary {
  return {
    id: item.id,
    slug: item.slug,
    statement: item.title,
    status: item.factStatus ?? "community",
    sourceUrl: item.firstSourceUrl,
  };
}
