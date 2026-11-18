import Link from "next/link";
import { ChevronRight, CircleCheck, EyeOff, Lock, MessageSquare, ShieldAlert } from "lucide-react";
import { PostCard, type PostCardProps } from "@/components/forum/post-card";
import { ReplyComposer } from "@/components/forum/reply-composer";
import { JsonLd } from "@/components/shared/json-ld";
import { Notice } from "@/components/shared/form-bits";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { tagLabel } from "@/config/tags";
import { threadExcerpt } from "@/lib/forum/excerpt";
import type { VoteValue } from "@/lib/forum/reputation";
import { canEdit, canPostLinks, isCategoryReadOnly } from "@/lib/forum/rules";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, discussionForumPostingJsonLd, qaPageJsonLd, type ForumPerson } from "@/lib/seo/jsonld";
import type { Flags } from "@/server/flags";
import type { ForumAuthor, ForumCategory, ForumPost, ThreadDetail } from "@/server/forum/model";
import type { ForumViewer } from "@/server/forum/viewer";

/**
 * The thread page (SPEC §5): the question, the accepted answer pinned under it, the replies in
 * order, and the reply box. Help & Questions threads with an accepted answer carry QAPage JSON-LD,
 * every other thread DiscussionForumPosting (SPEC §13), plus a BreadcrumbList.
 */
export function ThreadView({
  thread,
  category,
  viewer,
  votes,
  flags,
  hiddenFromPublic,
  now,
}: {
  thread: ThreadDetail;
  category: ForumCategory;
  viewer: ForumViewer | null;
  votes: Map<string, VoteValue>;
  flags: Flags;
  hiddenFromPublic: boolean;
  /** Request time, for the 30-minute edit window. */
  now: number;
}) {
  const path = routes.thread(thread.id, thread.slug);
  const absolute = (p: string) => new URL(p, siteConfig.url).toString();
  const readOnly = isCategoryReadOnly(category, flags);
  const questionDeleted = thread.bodyMd === "[deleted]";

  const accepted = thread.acceptedPostId
    ? (thread.posts.find((post) => post.id === thread.acceptedPostId && post.status === "visible") ?? null)
    : null;
  const replies = thread.posts.filter((post) => post.id !== accepted?.id);
  // Counted under the "replies" heading: the pinned accepted answer sits above it.
  const otherReplies = replies.filter((post) => post.status === "visible" && !post.isAi).length;
  const repliesHeading = accepted
    ? otherReplies === 0
      ? "No other replies"
      : `${otherReplies} other ${otherReplies === 1 ? "reply" : "replies"}`
    : otherReplies === 0
      ? "No replies yet"
      : `${otherReplies} ${otherReplies === 1 ? "reply" : "replies"}`;

  const isAuthor = Boolean(viewer && thread.authorId === viewer.id);
  const canReply =
    Boolean(viewer) &&
    !viewer!.banned &&
    !hiddenFromPublic &&
    (viewer!.staff || (thread.status !== "locked" && !readOnly));
  const showAccept = category.isQa && Boolean(viewer) && !viewer!.banned && (isAuthor || viewer!.staff);

  function voteMode(authorId: string | null): PostCardProps["voteMode"] {
    if (!viewer) return "signed-out";
    if (authorId === viewer.id || viewer.banned) return "own";
    return "vote";
  }

  function postProps(post: ForumPost): PostCardProps {
    const visible = post.status === "visible";
    const mine = Boolean(viewer && post.authorId === viewer.id);
    return {
      kind: "post",
      id: post.id,
      threadId: thread.id,
      author: post.author,
      bodyMd: post.bodyMd,
      createdAt: post.createdAt,
      editedAt: post.editedAt,
      score: post.score,
      myVote: votes.get(`post:${post.id}`) ?? 0,
      voteMode: visible ? voteMode(post.authorId) : "static",
      returnTo: `${path}#post-${post.id}`,
      deleted: post.status === "deleted",
      hiddenNote:
        post.status === "held"
          ? "Pending review: waiting for a moderator. Only you and moderators can see it."
          : post.status === "removed"
            ? "Removed by a moderator. Only you and moderators can see it."
            : null,
      isAi: post.isAi,
      spoiler: category.spoilersAllowed,
      blockedAuthor: Boolean(post.authorId && viewer?.blocked.has(post.authorId)),
      accepted: post.id === accepted?.id,
      showAccept: showAccept && visible && post.authorId !== thread.authorId,
      actions: {
        canQuote: canReply && visible,
        canEdit: visible && canEdit({ createdAt: post.createdAt, authorId: post.authorId }, viewer, now),
        canDelete: visible && Boolean(viewer && !viewer.banned && (mine || viewer.staff)),
        canReport: Boolean(viewer && !viewer.banned && post.authorId && !mine && post.status !== "deleted"),
      },
    };
  }

  const composerMode = !viewer ? "signed-out" : viewer.banned ? "banned" : canReply ? "reply" : "locked";
  const lockedReason = hiddenFromPublic
    ? "Replies open once a moderator approves this thread."
    : readOnly
      ? `${category.name} is read-only for now.`
      : "This thread is locked.";

  const heading = (
    <div className="mb-4 border-b pb-4">
      <h1 className="text-2xl leading-tight font-bold break-words sm:text-3xl">{thread.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={routes.forumCategory(category.slug)}>
          <Badge variant="tag" className="hover:text-foreground">
            {category.name}
          </Badge>
        </Link>
        {thread.status === "solved" ? (
          <Badge variant="teal">
            <CircleCheck aria-hidden="true" />
            Solved
          </Badge>
        ) : null}
        {thread.status === "locked" ? (
          <Badge variant="tag">
            <Lock aria-hidden="true" />
            Locked
          </Badge>
        ) : null}
        {thread.isSpoiler ? (
          <Badge variant="pink">
            <EyeOff aria-hidden="true" />
            Spoilers
          </Badge>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
      </div>
      {thread.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
          {thread.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="tag" size="sm">
                {tagLabel(tag)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const question: PostCardProps = {
    kind: "thread",
    id: thread.id,
    threadId: thread.id,
    author: thread.author,
    bodyMd: thread.bodyMd,
    createdAt: thread.createdAt,
    editedAt: thread.editedAt,
    score: thread.score,
    myVote: votes.get(`thread:${thread.id}`) ?? 0,
    voteMode: voteMode(thread.authorId),
    returnTo: path,
    deleted: questionDeleted,
    hiddenNote: hiddenFromPublic
      ? thread.status === "held"
        ? "Pending review: waiting for a moderator. Only you and moderators can see this thread."
        : "Removed by a moderator. Only you and moderators can see this thread."
      : null,
    spoiler: thread.isSpoiler || category.spoilersAllowed,
    blockedAuthor: Boolean(thread.authorId && viewer?.blocked.has(thread.authorId)),
    actions: {
      canQuote: canReply && !questionDeleted,
      canEdit:
        !questionDeleted &&
        ["open", "solved"].includes(thread.status) &&
        canEdit({ createdAt: thread.createdAt, authorId: thread.authorId }, viewer, now),
      canDelete: !questionDeleted && Boolean(viewer && !viewer.banned && (isAuthor || viewer.staff)),
      canReport: Boolean(viewer && !viewer.banned && thread.authorId && !isAuthor),
    },
    threadEdit: {
      threadId: thread.id,
      title: thread.title,
      bodyMd: thread.bodyMd,
      tags: thread.tags,
      isSpoiler: thread.isSpoiler,
      spoilerForced: category.spoilersAllowed,
    },
    hasReplies: thread.replyCount > 0,
    heading,
  };

  return (
    <div className="page-container py-6 sm:py-10">
      {hiddenFromPublic ? null : (
        <ThreadJsonLd thread={thread} category={category} accepted={accepted} absolute={absolute} />
      )}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absolute("/") },
          { name: "Forum", url: absolute("/forum") },
          { name: category.name, url: absolute(routes.forumCategory(category.slug)) },
          { name: thread.title, url: absolute(path) },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex min-w-0 items-center gap-1">
          <li className="shrink-0">
            <Link href="/forum" className="hover:text-foreground">
              Forum
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="min-w-0 truncate">
            <Link href={routes.forumCategory(category.slug)} className="hover:text-foreground">
              {category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mx-auto mt-4 flex max-w-3xl flex-col gap-4">
        {hiddenFromPublic ? (
          <Notice tone="info" title={thread.status === "held" ? "Pending review" : "Not public"}>
            <span className="inline-flex items-start gap-1.5">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {thread.status === "held"
                ? "A moderator checks this thread before it goes public. Only you and moderators can see it for now."
                : "Only you and moderators can see this thread."}
            </span>
          </Notice>
        ) : null}

        <PostCard {...question} />

        {accepted ? (
          <section aria-labelledby="accepted-heading" className="flex flex-col gap-2">
            <h2 id="accepted-heading" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-text">
              <CircleCheck className="size-4" aria-hidden="true" />
              Accepted answer
            </h2>
            <PostCard {...postProps(accepted)} />
          </section>
        ) : null}

        <section aria-labelledby="replies-heading" className="flex flex-col gap-3">
          <h2 id="replies-heading" className="mt-2 text-lg font-semibold">
            {repliesHeading}
          </h2>
          {replies.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {replies.map((post) => (
                <li key={post.id}>
                  <PostCard {...postProps(post)} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              {category.isQa ? "Know the answer? Be the first to help." : "Start the conversation."}
            </p>
          )}
        </section>

        <section className="mt-4" aria-label="Reply">
          <ReplyComposer
            threadId={thread.id}
            mode={composerMode}
            returnTo={path}
            canLink={viewer ? canPostLinks(viewer) : false}
            lockedReason={lockedReason}
          />
        </section>
      </div>
    </div>
  );
}

function personFor(author: ForumAuthor | null, absolute: (p: string) => string): ForumPerson {
  return author ? { name: author.username, url: absolute(routes.user(author.username)) } : { name: "Deleted user" };
}

function ThreadJsonLd({
  thread,
  category,
  accepted,
  absolute,
}: {
  thread: ThreadDetail;
  category: ForumCategory;
  accepted: ForumPost | null;
  absolute: (p: string) => string;
}) {
  const url = absolute(routes.thread(thread.id, thread.slug));
  const text = threadExcerpt(thread.bodyMd, 5000) || thread.title;
  const answers = thread.posts.filter((post) => post.status === "visible").slice(0, 50);
  const answerLd = (post: ForumPost) => ({
    text: threadExcerpt(post.bodyMd, 5000) || "(no text)",
    url: `${url}#post-${post.id}`,
    dateCreated: post.createdAt,
    upvoteCount: post.score,
    author: personFor(post.author, absolute),
  });

  if (category.isQa && accepted) {
    return (
      <JsonLd
        data={qaPageJsonLd({
          title: thread.title,
          text,
          url,
          dateCreated: thread.createdAt,
          upvoteCount: thread.score,
          answerCount: answers.length,
          author: personFor(thread.author, absolute),
          accepted: answerLd(accepted),
          suggested: answers.filter((post) => post.id !== accepted.id).map(answerLd),
        })}
      />
    );
  }
  return (
    <JsonLd
      data={discussionForumPostingJsonLd({
        title: thread.title,
        text,
        url,
        datePublished: thread.createdAt,
        dateModified: thread.editedAt,
        author: personFor(thread.author, absolute),
        commentCount: thread.replyCount,
        upvoteCount: Math.max(thread.score, 0),
        comments: answers.map((post) => ({
          text: threadExcerpt(post.bodyMd, 5000) || "(no text)",
          url: `${url}#post-${post.id}`,
          datePublished: post.createdAt,
          author: personFor(post.author, absolute),
        })),
      })}
    />
  );
}
