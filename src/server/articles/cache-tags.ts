import type { ArticleType } from "@/config/articles";

/**
 * Cache tags for article reads (D-005). Publishing invalidates all three levels: every list
 * ("articles"), the type's lists and the article itself.
 */
export const ARTICLES_TAG = "articles";
export const SITE_SETTINGS_TAG = "site-settings";

export const typeTag = (type: ArticleType) => `articles:${type}`;
export const articleTag = (type: ArticleType, slug: string) => `article:${type}:${slug}`;

export function tagsForArticle(type: ArticleType, slug: string, previousSlug?: string | null): string[] {
  const tags = [ARTICLES_TAG, typeTag(type), articleTag(type, slug)];
  if (previousSlug && previousSlug !== slug) tags.push(articleTag(type, previousSlug));
  return tags;
}
