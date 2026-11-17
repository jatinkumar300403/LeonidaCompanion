import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";
import { ARTICLE_TYPE_INFO, articlePath, type ArticleType } from "@/config/articles";
import { siteConfig } from "@/config/site";
import { env } from "@/env";
import { buildIndexNowPayload, INDEXNOW_ENDPOINT } from "@/lib/indexnow";
import { tagsForArticle } from "@/server/articles/cache-tags";
import { enqueueArticleEmbedding, removeArticleEmbedding } from "@/server/articles/embedding";

/**
 * The publish pipeline (SPEC §4): invalidate the cache tags, then, after the response, (re)embed
 * the article (Phase 7 stub) and ping IndexNow. Server Actions use updateTag so the admin sees
 * the change at once; cron routes use revalidateTag(…, "max") (D-005).
 */
export type PipelineMode = "action" | "background";

export type PipelineArticle = { id: string; type: ArticleType; slug: string; previousSlug?: string | null };

export function invalidateArticle(article: PipelineArticle, mode: PipelineMode): void {
  for (const tag of tagsForArticle(article.type, article.slug, article.previousSlug)) {
    if (mode === "action") updateTag(tag);
    else revalidateTag(tag, "max");
  }
}

/** The article went live (or a live article changed). */
export function runPublishPipeline(article: PipelineArticle, mode: PipelineMode): void {
  invalidateArticle(article, mode);
  after(async () => {
    await enqueueArticleEmbedding(article.id);
    await pingIndexNow(article.type, article.slug);
  });
}

/** The article left the site (unpublished, archived, deleted, or rescheduled into the future). */
export function runUnpublishPipeline(article: PipelineArticle, mode: PipelineMode): void {
  invalidateArticle(article, mode);
  after(() => removeArticleEmbedding(article.id));
}

async function pingIndexNow(type: ArticleType, slug: string): Promise<void> {
  const key = env.INDEXNOW_KEY;
  if (!key) return;
  const paths = [articlePath(type, slug), ARTICLE_TYPE_INFO[type].index].filter(
    (path): path is NonNullable<typeof path> => Boolean(path),
  );
  const payload = buildIndexNowPayload(siteConfig.url, key, paths);
  if (!payload) return;
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status !== 202) console.warn(`[indexnow] ping returned ${response.status}.`);
  } catch (error) {
    console.warn("[indexnow] ping failed:", error);
  }
}
