import "server-only";

/**
 * Accepted answers feed Ask AI (SPEC §5: embedded into knowledge_chunks as `forum_solution`,
 * D-021). Phase 4 ships the hook points as no-ops called inside `after()`; Phase 7 fills them in.
 */
export async function enqueueForumSolutionEmbedding(threadId: number, postId: number): Promise<void> {
  console.info(`[embedding] forum solution ${threadId}/${postId}: embedding is a no-op until Phase 7.`);
}

/** The answer was unaccepted (or deleted): Phase 7 removes its chunks here. */
export async function removeForumSolutionEmbedding(threadId: number): Promise<void> {
  console.info(`[embedding] forum solution for thread ${threadId}: chunk removal is a no-op until Phase 7.`);
}
