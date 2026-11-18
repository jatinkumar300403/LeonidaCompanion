import "server-only";

/**
 * Forum lifecycle hooks. They run inside `after()`, so they never slow down posting.
 *
 * Phase 8 fills `onThreadCreated()`: for a thread in a Q&A category (Help & Questions), run Ask AI
 * on the title + body and, when the top retrieval score is ≥ ASK_MIN_SCORE, insert a post with
 * `is_ai = true` (SPEC §5 "AI suggested answer"). It must never auto-accept, and it inserts
 * nothing when retrieval is weak.
 */
export type CreatedThread = {
  id: number;
  slug: string;
  title: string;
  bodyMd: string;
  categoryId: number;
  isQa: boolean;
  isSpoiler: boolean;
  authorId: string;
};

export async function onThreadCreated(thread: CreatedThread): Promise<void> {
  if (!thread.isQa) return;
  console.info(`[forum] thread ${thread.id} created: AI suggested answers arrive in Phase 8.`);
}
