import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Flame, MessageSquarePlus, MessagesSquare, Sparkles } from "lucide-react";
import { CategoryCard } from "@/components/forum/category-card";
import { ForumList } from "@/components/forum/forum-list";
import { ThreadRow } from "@/components/forum/thread-row";
import { PageHeader, SectionHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isCategoryReadOnly } from "@/lib/forum/rules";
import { forumListHref, hasSortParam, parseForumListState, SORT_LABELS } from "@/lib/forum/sort";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFlags } from "@/server/flags";
import type { ForumThreadSummary } from "@/server/forum/model";
import { getCategories, listThreads } from "@/server/forum/queries";
import { getForumViewer, type ForumViewer } from "@/server/forum/viewer";

/**
 * /forum (SPEC §1, §5): categories with thread counts, hot threads and unanswered questions.
 * With ?sort= it lists threads from every category instead (the home page's "Unanswered" link).
 */
export async function generateMetadata({ searchParams }: PageProps<"/forum">): Promise<Metadata> {
  const params = await searchParams;
  const state = parseForumListState(params);
  const listing = hasSortParam(params);
  return buildMetadata({
    title: listing ? `${SORT_LABELS[state.sort]} threads` : "GTA 6 Help Forum",
    section: listing ? "Forum" : undefined,
    path: "/forum",
    description: "Ask GTA 6 questions, share discoveries and help other players.",
    noindex: listing && state.page > 1,
  });
}

function withoutBlocked(threads: ForumThreadSummary[], viewer: ForumViewer | null): ForumThreadSummary[] {
  if (!viewer || viewer.blocked.size === 0) return threads;
  return threads.filter((thread) => !thread.authorId || !viewer.blocked.has(thread.authorId));
}

const startThread = (
  <Button asChild>
    <Link href="/forum/new">
      <MessageSquarePlus aria-hidden="true" />
      Start a thread
    </Link>
  </Button>
);

export default async function ForumPage({ searchParams }: PageProps<"/forum">) {
  const params = await searchParams;
  const viewer = await getForumViewer();

  if (hasSortParam(params)) {
    const state = parseForumListState(params);
    const page = await listThreads({ categoryId: null, sort: state.sort, t: state.t, page: state.page });
    return (
      <div className="page-container py-8 sm:py-12">
        <PageHeader
          eyebrow="Help Forum"
          title={state.sort === "unanswered" ? "Unanswered questions" : `${SORT_LABELS[state.sort]} threads`}
          description={
            state.sort === "unanswered"
              ? "Questions still waiting for a reply, or for an accepted answer after a day."
              : "Threads from every category."
          }
          actions={
            <>
              {startThread}
              <Button asChild variant="secondary">
                <Link href="/forum">All categories</Link>
              </Button>
            </>
          }
        />
        <div className="mt-8">
          <ForumList
            basePath="/forum"
            keepSort
            state={state}
            threads={withoutBlocked(page.items, viewer)}
            hasMore={page.hasMore}
            emptyTitle={state.sort === "unanswered" ? "Nothing unanswered right now" : "No threads yet"}
            emptyDescription={
              state.sort === "unanswered" ? "Every question has a reply. Nice." : "Be the first to start one."
            }
            emptyAction={startThread}
          />
        </div>
      </div>
    );
  }

  const [categories, flags, hot, unanswered] = await Promise.all([
    getCategories(),
    getFlags(),
    listThreads({ categoryId: null, sort: "hot", t: "week", page: 1, size: 8 }),
    listThreads({ categoryId: null, sort: "unanswered", t: "week", page: 1, size: 5 }),
  ]);
  const hotThreads = withoutBlocked(hot.items, viewer);
  const unansweredThreads = withoutBlocked(unanswered.items, viewer);

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader
        eyebrow="Help Forum"
        title="GTA 6 help forum"
        description="Ask questions, share discoveries and help other players. Mark the reply that solved it so the next person finds it fast."
        actions={
          <>
            {startThread}
            <Button asChild variant="secondary">
              <Link href="/ask">
                <Sparkles aria-hidden="true" />
                Ask AI first
              </Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="categories-heading" className="mt-10">
        <SectionHeader id="categories-heading" title="Categories" />
        {categories.length > 0 ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} readOnly={isCategoryReadOnly(category, flags)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-5"
            as="h3"
            icon={MessagesSquare}
            title="The forum is warming up"
            description="Categories will appear here shortly."
          />
        )}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="hot-heading">
          <SectionHeader
            id="hot-heading"
            title="Hot right now"
            href={forumListHref("/forum", { sort: "hot" }, true)}
            linkLabel="All threads"
          />
          {hotThreads.length > 0 ? (
            <Card className="mt-5">
              <ol className="divide-y">
                {hotThreads.map((thread) => (
                  <li key={thread.id}>
                    <ThreadRow thread={thread} />
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <EmptyState
              className="mt-5"
              as="h3"
              icon={Flame}
              title="No threads yet"
              description="Ask the first question. Someone out there knows the answer."
              actions={startThread}
            />
          )}
        </section>

        <section aria-labelledby="unanswered-heading">
          <SectionHeader
            id="unanswered-heading"
            title="Unanswered"
            href={forumListHref("/forum", { sort: "unanswered" }, true)}
            linkLabel="See all"
          />
          {unansweredThreads.length > 0 ? (
            <Card className="mt-5">
              <ol className="divide-y">
                {unansweredThreads.map((thread) => (
                  <li key={thread.id}>
                    <ThreadRow thread={thread} />
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <EmptyState
              className="mt-5"
              as="h3"
              compact
              icon={CircleHelp}
              title="All caught up"
              description="Every question has a reply. Check back soon."
            />
          )}
        </section>
      </div>
    </div>
  );
}
