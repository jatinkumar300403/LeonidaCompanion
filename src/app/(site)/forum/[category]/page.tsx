import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, EyeOff, Lock, MessageSquarePlus } from "lucide-react";
import { ForumList } from "@/components/forum/forum-list";
import { Notice } from "@/components/shared/form-bits";
import { PageHeader } from "@/components/shared/headers";
import { Button } from "@/components/ui/button";
import { isCategoryReadOnly } from "@/lib/forum/rules";
import { forumListHref, parseForumListState, SORT_LABELS } from "@/lib/forum/sort";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFlags } from "@/server/flags";
import { getCategory, listThreads } from "@/server/forum/queries";
import { getForumViewer } from "@/server/forum/viewer";

/** /forum/[category] (SPEC §1, §5): one category, sorted Hot · New · Top · Unanswered, paged. */
export async function generateMetadata({ params, searchParams }: PageProps<"/forum/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) return buildMetadata({ title: "Forum category", path: routes.forumCategory(slug), noindex: true });
  const state = parseForumListState(await searchParams);
  const sorted = state.sort !== "hot" ? ` · ${SORT_LABELS[state.sort]}` : "";
  return buildMetadata({
    title: `${category.name}${sorted}`,
    section: "Forum",
    // Sorted and paged views point at the category itself; page 2+ stays out of the index.
    path: routes.forumCategory(category.slug),
    description: category.description ?? `GTA 6 ${category.name} threads from the community.`,
    noindex: state.page > 1,
  });
}

export default async function ForumCategoryPage({ params, searchParams }: PageProps<"/forum/[category]">) {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const state = parseForumListState(await searchParams);
  const [page, flags, viewer] = await Promise.all([
    listThreads({ categoryId: category.id, sort: state.sort, t: state.t, page: state.page }),
    getFlags(),
    getForumViewer(),
  ]);
  const readOnly = isCategoryReadOnly(category, flags);
  const canPost = !readOnly || Boolean(viewer?.staff);
  const threads = viewer
    ? page.items.filter((thread) => !thread.authorId || !viewer.blocked.has(thread.authorId))
    : page.items;
  const newThread = (
    <Button asChild>
      <Link href={routes.newThread(undefined, category.slug)}>
        <MessageSquarePlus aria-hidden="true" />
        New thread
      </Link>
    </Button>
  );

  return (
    <div className="page-container py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/forum" className="hover:text-foreground">
              Forum
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate text-foreground">
            {category.name}
          </li>
        </ol>
      </nav>

      <PageHeader
        className="mt-4"
        eyebrow="Help Forum"
        title={category.name}
        description={category.description}
        actions={canPost ? newThread : null}
      />

      <div className="mt-6 flex flex-col gap-3">
        {readOnly ? (
          <Notice tone="info" title="Read-only for now">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden="true" />
              {category.slug === "online"
                ? "This category opens when the online mode launches."
                : "New threads and replies are closed here."}
            </span>
          </Notice>
        ) : null}
        {category.spoilersAllowed ? (
          <Notice tone="info" title="Story spoilers allowed">
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-3.5" aria-hidden="true" />
              Every post here sits behind a spoiler warning. Keep thread titles spoiler-free.
            </span>
          </Notice>
        ) : null}
      </div>

      <div className="mt-6">
        <ForumList
          basePath={routes.forumCategory(category.slug)}
          state={state}
          threads={threads}
          hasMore={page.hasMore}
          emptyTitle={state.sort === "unanswered" ? "Nothing unanswered" : "No threads here yet"}
          emptyDescription={
            state.sort === "unanswered"
              ? "Every question here has an answer. Nice."
              : canPost
                ? "Be the first to start one."
                : "Check back soon."
          }
          emptyAction={canPost && state.sort !== "unanswered" ? newThread : undefined}
        />
        {state.sort !== "hot" && page.items.length === 0 && state.page === 1 ? (
          <p className="mt-3 text-center text-sm">
            <Link href={forumListHref(routes.forumCategory(category.slug), {})} className="underline">
              Back to hot threads
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
