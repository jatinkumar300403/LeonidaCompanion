/**
 * Cache tags for forum reads (D-064). "forum" covers categories, counts and every list; each
 * thread page also has its own tag. Server Actions call updateTag on both after a write.
 */
export const FORUM_TAG = "forum";
export const threadTag = (id: number) => `thread:${id}`;
