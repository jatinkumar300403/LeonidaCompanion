import "server-only";

/**
 * Embedding jobs for published articles (SPEC §4/§7, D-021). Phase 3 ships the hook points as
 * no-ops; Phase 7 fills them in (chunk the body, embed with Voyage, upsert knowledge_chunks).
 * They run inside `after()`, so they never slow down a publish.
 */
export async function enqueueArticleEmbedding(articleId: string): Promise<void> {
  console.info(`[embedding] article ${articleId}: embedding is a no-op until Phase 7.`);
}

/** Unpublished, archived or deleted: Phase 7 removes the article's chunks here. */
export async function removeArticleEmbedding(articleId: string): Promise<void> {
  console.info(`[embedding] article ${articleId}: chunk removal is a no-op until Phase 7.`);
}
