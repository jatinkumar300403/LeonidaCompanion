import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArticleIndex } from "@/components/articles/article-index";
import { ArticlePage } from "@/components/articles/article-page";
import { ARTICLE_TYPE_INFO, articlePath, type ArticleType } from "@/config/articles";
import { tagLabel } from "@/config/tags";
import { indexHref, parseIndexState } from "@/lib/articles/index-url";
import { isValidSlug } from "@/lib/articles/slug";
import { buildMetadata } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import { getArticle, getRelatedArticles, listArticles } from "@/server/articles/queries";

/**
 * Shared bodies for the content routes, so each `page.tsx` stays a few lines (CLAUDE.md: routes
 * are thin). Index pages read searchParams and render per request over tag-cached data; article
 * pages are ISR (D-050).
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export type IndexCopy = {
  type: ArticleType;
  basePath: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  metaDescription: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
};

export async function indexMetadata(copy: IndexCopy, searchParams: SearchParams): Promise<Metadata> {
  const state = parseIndexState(await searchParams);
  const title = state.tag ? `${copy.metaTitle}: ${tagLabel(state.tag)}` : copy.metaTitle;
  return buildMetadata({
    title,
    description: copy.metaDescription,
    // Canonical keeps the tag only: sort, spoiler toggle and later pages point at the main list.
    path: indexHref(copy.basePath, { tag: state.tag }),
    image: ogImagePath(copy.metaTitle, ARTICLE_TYPE_INFO[copy.type].section),
    noindex: Boolean(state.cursor),
  });
}

export async function IndexRoute({
  copy,
  searchParams,
  intro,
}: {
  copy: IndexCopy;
  searchParams: SearchParams;
  intro?: React.ReactNode;
}) {
  const state = parseIndexState(await searchParams);
  const page = await listArticles({
    type: copy.type,
    tag: state.tag,
    spoilerFree: state.spoilerFree,
    sort: state.sort,
    cursor: state.cursor,
  });
  return (
    <ArticleIndex
      type={copy.type}
      basePath={copy.basePath}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      icon={copy.icon}
      emptyTitle={copy.emptyTitle}
      emptyDescription={copy.emptyDescription}
      state={state}
      page={page}
      intro={intro}
    />
  );
}

async function loadArticle(type: ArticleType, slug: string) {
  const decoded = decodeURIComponent(slug);
  if (!isValidSlug(decoded)) return null;
  return getArticle(type, decoded);
}

export async function articleMetadata(type: ArticleType, slug: string): Promise<Metadata> {
  const article = await loadArticle(type, slug);
  const section = ARTICLE_TYPE_INFO[type].section;
  if (!article)
    return buildMetadata({ title: "Not found", section, path: ARTICLE_TYPE_INFO[type].index ?? "/", noindex: true });
  return buildMetadata({
    title: article.title,
    section,
    description: article.summary,
    path: articlePath(type, article.slug) ?? "/",
    image: ogImagePath(article.title, section),
    article: { publishedTime: article.publishedAt, modifiedTime: article.updatedAt, tags: article.tags },
  });
}

export async function ArticleRoute({ type, slug }: { type: ArticleType; slug: string }) {
  const article = await loadArticle(type, slug);
  if (!article) notFound();
  const related = await getRelatedArticles(article);
  return <ArticlePage article={article} related={related} />;
}
