import Link from "next/link";
import { Bot, CircleCheck, EyeOff, ShieldAlert } from "lucide-react";
import { AcceptButton } from "@/components/forum/accept-button";
import { ForumVote } from "@/components/forum/forum-vote";
import { PostActions } from "@/components/forum/post-actions";
import { PostBody, PostEditProvider, type ThreadEditValues } from "@/components/forum/post-edit";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { RelativeTime } from "@/components/shared/relative-time";
import { SpoilerBlock } from "@/components/shared/spoiler";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { AI_POST_LABEL, DELETED_USER } from "@/config/forum";
import { ROLE_LABELS } from "@/config/auth";
import type { VoteValue } from "@/lib/forum/reputation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ForumAuthor } from "@/server/forum/model";

/**
 * One question or reply on the thread page (SPEC §5): author, time, "edited", votes, the body
 * (spoiler-wrapped, collapsed for blocked authors, "[deleted]" when deleted) and its actions.
 * The body renders on the server; only the controls are client components.
 */
export type PostCardProps = {
  kind: "thread" | "post";
  /** Post id, or the thread id for the question. */
  id: number;
  threadId: number;
  author: ForumAuthor | null;
  bodyMd: string;
  createdAt: string;
  editedAt: string | null;
  score: number;
  myVote: VoteValue;
  voteMode: "vote" | "own" | "signed-out";
  returnTo: string;
  deleted: boolean;
  /** Only the author (or staff) can see it: held for review or removed. */
  hiddenNote?: string | null;
  isAi?: boolean;
  spoiler: boolean;
  blockedAuthor: boolean;
  accepted?: boolean;
  showAccept?: boolean;
  actions: {
    canQuote: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canReport: boolean;
  };
  threadEdit?: ThreadEditValues;
  hasReplies?: boolean;
  /** Extra content above the body (the question's title block). */
  heading?: React.ReactNode;
};

export function PostCard(props: PostCardProps) {
  const { kind, id, threadId, author, bodyMd, deleted, spoiler, blockedAuthor } = props;
  const anchor = kind === "thread" ? "question" : `post-${id}`;

  let content: React.ReactNode = <MarkdownRenderer source={bodyMd} size="sm" mentions />;
  if (deleted) content = <p className="text-sm text-muted-foreground italic">[deleted]</p>;
  else if (spoiler) content = <SpoilerBlock label="Story spoilers">{content}</SpoilerBlock>;
  if (!deleted && blockedAuthor) {
    content = (
      <details className="rounded-lg border border-dashed px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          You blocked {author ? `@${author.username}` : "this user"}. Show anyway
        </summary>
        <div className="mt-3">{content}</div>
      </details>
    );
  }

  return (
    <PostEditProvider>
      <article
        id={anchor}
        aria-label={kind === "thread" ? "Question" : `Reply by ${author ? `@${author.username}` : DELETED_USER}`}
        className={cn(
          "scroll-mt-24 rounded-[14px] border bg-surface p-3 sm:p-5",
          props.accepted && "border-teal/40 bg-teal/5",
          props.hiddenNote && "border-dashed border-orange/50",
        )}
      >
        {props.heading}
        <div className="flex gap-2 sm:gap-4">
          <div className="shrink-0">
            <ForumVote
              targetType={kind}
              targetId={id}
              score={props.score}
              myVote={props.myVote}
              mode={props.voteMode}
              returnTo={props.returnTo}
            />
          </div>
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {author ? (
                <Link
                  href={routes.user(author.username)}
                  className="inline-flex min-w-0 items-center gap-2 font-medium hover:underline"
                >
                  <UserAvatar
                    username={author.username}
                    displayName={author.displayName}
                    avatarUrl={author.avatarUrl}
                    size="sm"
                  />
                  <span className="truncate">@{author.username}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">{props.isAi ? "Leonida AI" : DELETED_USER}</span>
              )}
              {author && author.role !== "user" ? (
                <Badge variant={author.role === "admin" ? "pink" : "violet"} size="sm">
                  {ROLE_LABELS[author.role]}
                </Badge>
              ) : null}
              {props.isAi ? (
                <Badge variant="violet" size="sm">
                  <Bot aria-hidden="true" />
                  {AI_POST_LABEL}
                </Badge>
              ) : null}
              {props.accepted ? (
                <Badge variant="teal" size="sm">
                  <CircleCheck aria-hidden="true" />
                  Accepted answer
                </Badge>
              ) : null}
              <span className="text-muted-foreground">
                <RelativeTime date={props.createdAt} />
                {props.editedAt && !deleted ? <span> · edited</span> : null}
              </span>
            </header>

            {props.hiddenNote ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-orange-text">
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                {props.hiddenNote}
              </p>
            ) : null}

            <div className="mt-3 min-w-0">
              <PostBody post={kind === "post" ? { id, bodyMd } : undefined} thread={props.threadEdit}>
                {content}
              </PostBody>
            </div>

            <footer className="mt-3 flex items-center gap-2">
              {props.showAccept && !deleted ? (
                <AcceptButton threadId={threadId} postId={id} accepted={Boolean(props.accepted)} />
              ) : null}
              {spoiler && !deleted ? (
                <span className="inline-flex items-center gap-1 text-xs text-pink-text">
                  <EyeOff className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Contains </span>Spoilers
                </span>
              ) : null}
              <div className="ml-auto">
                <PostActions
                  kind={kind}
                  id={id}
                  threadId={threadId}
                  anchor={anchor}
                  author={author ? { id: author.id, username: author.username } : null}
                  bodyMd={deleted ? "" : bodyMd}
                  hasReplies={props.hasReplies}
                  {...props.actions}
                />
              </div>
            </footer>
          </div>
        </div>
      </article>
    </PostEditProvider>
  );
}
