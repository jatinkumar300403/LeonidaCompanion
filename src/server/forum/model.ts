import "server-only";
import type { Role } from "@/config/auth";
import { threadExcerpt } from "@/lib/forum/excerpt";
import type { Database } from "@/types/database";
import type { ThreadSummary } from "@/types/content";

/** Forum rows → view models (SPEC §5). Column lists keep list queries away from full bodies. */

export const THREAD_LIST_COLUMNS =
  "id, category_id, author_id, title, slug, excerpt, tags, is_spoiler, status, accepted_post_id, score, reply_count, last_activity_at, created_at";
export const THREAD_DETAIL_COLUMNS = `${THREAD_LIST_COLUMNS}, body_md, edited_at`;
export const POST_COLUMNS =
  "id, thread_id, author_id, body_md, is_ai, ai_sources, score, status, created_at, edited_at, reply_to_post_id";
export const AUTHOR_COLUMNS = "id, username, display_name, avatar_url, role, reputation";

export const VISIBLE_THREAD_STATUSES = ["open", "solved", "locked"] as const;

type ThreadRow = Database["public"]["Tables"]["threads"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type AuthorRow = Pick<
  Database["public"]["Views"]["public_profiles"]["Row"],
  "id" | "username" | "display_name" | "avatar_url" | "role" | "reputation"
>;

export type ThreadListRow = Pick<
  ThreadRow,
  | "id"
  | "category_id"
  | "author_id"
  | "title"
  | "slug"
  | "excerpt"
  | "tags"
  | "is_spoiler"
  | "status"
  | "accepted_post_id"
  | "score"
  | "reply_count"
  | "last_activity_at"
  | "created_at"
>;
export type ThreadDetailRow = ThreadListRow & Pick<ThreadRow, "body_md" | "edited_at">;
export type PostListRow = Pick<
  PostRow,
  | "id"
  | "thread_id"
  | "author_id"
  | "body_md"
  | "is_ai"
  | "ai_sources"
  | "score"
  | "status"
  | "created_at"
  | "edited_at"
  | "reply_to_post_id"
>;

export type ForumCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isQa: boolean;
  isLocked: boolean;
  spoilersAllowed: boolean;
  threadCount: number;
};

export type ForumAuthor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  reputation: number;
};

export type ThreadStatus = "open" | "solved" | "locked" | "removed" | "held";
export type PostStatus = "visible" | "removed" | "held" | "deleted";

/** A list row: the shared ThreadSummary plus what the viewer filter and links need. */
export type ForumThreadSummary = ThreadSummary & { authorId: string | null; createdAt: string };

export type ForumPost = {
  id: number;
  threadId: number;
  authorId: string | null;
  author: ForumAuthor | null;
  bodyMd: string;
  isAi: boolean;
  score: number;
  status: PostStatus;
  createdAt: string;
  editedAt: string | null;
  replyToPostId: number | null;
};

export type ThreadDetail = {
  id: number;
  slug: string;
  title: string;
  bodyMd: string;
  tags: string[];
  isSpoiler: boolean;
  status: ThreadStatus;
  acceptedPostId: number | null;
  score: number;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  editedAt: string | null;
  categoryId: number;
  authorId: string | null;
  author: ForumAuthor | null;
  posts: ForumPost[];
};

export function toAuthor(row: AuthorRow): ForumAuthor | null {
  if (!row.id || !row.username) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: (row.role ?? "user") as Role,
    reputation: row.reputation ?? 0,
  };
}

export function authorName(author: ForumAuthor | null): string {
  return author ? `@${author.username}` : "[deleted user]";
}

export function toThreadSummary(
  row: ThreadListRow,
  category: Pick<ForumCategory, "slug" | "name"> | undefined,
  author: ForumAuthor | null,
): ForumThreadSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: { slug: category?.slug ?? "general", name: category?.name ?? "Forum" },
    authorName: authorName(author),
    authorId: row.author_id,
    score: row.score,
    replyCount: row.reply_count,
    isSolved: row.status === "solved",
    isSpoiler: row.is_spoiler,
    isLocked: row.status === "locked",
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    excerpt: threadExcerpt(row.excerpt),
  };
}

export function toPost(row: PostListRow, authors: Map<string, ForumAuthor>): ForumPost {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    author: row.author_id ? (authors.get(row.author_id) ?? null) : null,
    bodyMd: row.body_md,
    isAi: row.is_ai,
    score: row.score,
    status: row.status as PostStatus,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    replyToPostId: row.reply_to_post_id,
  };
}

export function toThreadDetail(
  row: ThreadDetailRow,
  posts: PostListRow[],
  authors: Map<string, ForumAuthor>,
): ThreadDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    bodyMd: row.body_md,
    tags: row.tags,
    isSpoiler: row.is_spoiler,
    status: row.status as ThreadStatus,
    acceptedPostId: row.accepted_post_id,
    score: row.score,
    replyCount: row.reply_count,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    categoryId: row.category_id,
    authorId: row.author_id,
    author: row.author_id ? (authors.get(row.author_id) ?? null) : null,
    posts: posts.map((post) => toPost(post, authors)),
  };
}
