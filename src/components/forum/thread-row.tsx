import Link from "next/link";
import { CircleCheck, EyeOff, Lock, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatRelativeTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ThreadSummary } from "@/types/content";

/**
 * Forum list row: score, title, category chip, replies, solved tick, last activity (SPEC §2).
 * The score is static here; voting happens on the thread page.
 */
export function ThreadRow({ thread, now, className }: { thread: ThreadSummary; now?: Date; className?: string }) {
  return (
    <article className={cn("group relative flex gap-4 px-4 py-4 transition-colors hover:bg-accent/50", className)}>
      <div
        className={cn(
          "flex w-12 shrink-0 flex-col items-center justify-center self-start rounded-lg border py-1.5",
          thread.isSolved ? "border-teal/30 bg-teal/12 text-teal-text" : "bg-surface-2",
        )}
      >
        <span className="font-mono text-base leading-5 font-semibold tabular-nums">{formatCount(thread.score)}</span>
        <span className={cn("text-[0.6875rem]", thread.isSolved ? "" : "text-muted-foreground")}>votes</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-base leading-snug font-semibold">
          <Link
            href={routes.thread(thread.id, thread.slug)}
            className="group-has-[a:focus-visible]:underline after:absolute after:inset-0 focus-visible:outline-none"
          >
            {thread.title}
          </Link>
        </h3>
        {thread.excerpt ? (
          thread.isSpoiler ? (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              <span className="sr-only">Preview hidden: this thread has spoilers.</span>
              <span aria-hidden="true" className="blur-[5px] select-none">
                {thread.excerpt}
              </span>
            </p>
          ) : (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{thread.excerpt}</p>
          )
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <Badge variant="tag" size="sm">
            {thread.category.name}
          </Badge>
          {thread.isSolved ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-text">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              Solved
            </span>
          ) : null}
          {thread.isSpoiler ? (
            <span className="inline-flex items-center gap-1 font-medium text-pink-text">
              <EyeOff className="size-3.5" aria-hidden="true" />
              Spoilers
            </span>
          ) : null}
          {thread.isLocked ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" aria-hidden="true" />
              Locked
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            <span className="font-semibold tabular-nums">{formatCount(thread.replyCount)}</span>
            <span className="sr-only">replies</span>
          </span>
          <span>
            {thread.authorName} ·{" "}
            <time dateTime={thread.lastActivityAt}>{formatRelativeTime(thread.lastActivityAt, now)}</time>
          </span>
        </div>
      </div>
    </article>
  );
}
