import Link from "next/link";
import { ChevronLeft, ChevronRight, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { ThreadRow } from "@/components/forum/thread-row";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FORUM_SORTS,
  forumListHref,
  SORT_LABELS,
  TOP_WINDOWS,
  WINDOW_LABELS,
  type ForumListState,
} from "@/lib/forum/sort";
import { cn } from "@/lib/utils";
import type { ForumThreadSummary } from "@/server/forum/model";

/**
 * A sorted, paged thread list (SPEC §5): Hot · New · Top (today / week / all time) · Unanswered.
 * Every control is a real link, so it all works before hydration and crawlers can page through.
 */
export function ForumList({
  basePath,
  state,
  threads,
  hasMore,
  keepSort = false,
  emptyTitle = "No threads here yet",
  emptyDescription = "Be the first to start one.",
  emptyAction,
}: {
  basePath: string;
  state: ForumListState;
  threads: ForumThreadSummary[];
  hasMore: boolean;
  /** The /forum landing shows a list only when ?sort= is present. */
  keepSort?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const href = (next: Partial<ForumListState>) => forumListHref(basePath, { ...state, page: 1, ...next }, keepSort);

  return (
    <div>
      <nav aria-label="Sort threads" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Sort:
          </span>
          {FORUM_SORTS.map((sort) => (
            <Pill key={sort} href={href({ sort })} active={state.sort === sort}>
              {SORT_LABELS[sort]}
            </Pill>
          ))}
        </div>
        {state.sort === "top" ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Time range">
            {TOP_WINDOWS.map((t) => (
              <Pill key={t} href={href({ sort: "top", t })} active={state.t === t} size="sm">
                {WINDOW_LABELS[t]}
              </Pill>
            ))}
          </div>
        ) : null}
      </nav>

      {threads.length > 0 ? (
        <Card className="mt-5 gap-0 py-0">
          <ol className="divide-y" data-testid="thread-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <ThreadRow thread={thread} />
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <EmptyState
          className="mt-5"
          icon={MessagesSquare}
          title={state.page > 1 ? "No more threads" : emptyTitle}
          description={state.page > 1 ? "You've reached the end of this list." : emptyDescription}
          actions={state.page > 1 ? undefined : emptyAction}
        />
      )}

      {state.page > 1 || hasMore ? (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
          {state.page > 1 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={forumListHref(basePath, { ...state, page: state.page - 1 }, keepSort)} rel="prev">
                <ChevronLeft aria-hidden="true" />
                Newer
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">Page {state.page}</span>
          {hasMore ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={forumListHref(basePath, { ...state, page: state.page + 1 }, keepSort)} rel="next">
                More
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function Pill({
  href,
  active,
  size = "default",
  children,
}: {
  href: ReturnType<typeof forumListHref>;
  active: boolean;
  size?: "default" | "sm";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap transition-colors",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm",
        active
          ? "border-pink/40 bg-pink/12 text-pink-text"
          : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
