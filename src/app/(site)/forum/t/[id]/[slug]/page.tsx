import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ThreadView } from "@/components/forum/thread-view";
import { threadExcerpt } from "@/lib/forum/excerpt";
import { isThinThread } from "@/lib/forum/rules";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import { getFlags } from "@/server/flags";
import { getCategoryById, getThread } from "@/server/forum/queries";
import { getForumViewer, getMyVotes, getThreadForViewer } from "@/server/forum/viewer";

/**
 * /forum/t/[id]/[slug] (SPEC §1, §5): dynamic, with the public thread cached for 30 s and
 * revalidated on every new post (D-064). A wrong or old slug redirects to the current one.
 */
function threadId(raw: string): number | null {
  const id = Number(raw);
  return /^\d{1,15}$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/forum/t/[id]/[slug]">): Promise<Metadata> {
  const { id: raw, slug } = await params;
  const id = threadId(raw);
  const thread = id ? await getThread(id) : null;
  if (!id || !thread) {
    return buildMetadata({ title: "Thread", section: "Forum", path: routes.thread(id ?? 0, slug), noindex: true });
  }
  const category = await getCategoryById(thread.categoryId);
  const spoiler = thread.isSpoiler || Boolean(category?.spoilersAllowed);
  const description = spoiler
    ? `A spoiler thread in ${category?.name ?? "the forum"}. Open it to read the question and the answers.`
    : threadExcerpt(thread.bodyMd, 160) || thread.title;
  return buildMetadata({
    title: thread.title,
    section: "Forum",
    path: routes.thread(thread.id, thread.slug),
    description,
    image: ogImagePath(thread.title, "Forum"),
    // SPEC §13 / D-017: thin threads and deleted questions stay out of search.
    noindex: isThinThread(thread) || thread.bodyMd === "[deleted]",
  });
}

export default async function ThreadPage({ params }: PageProps<"/forum/t/[id]/[slug]">) {
  const { id: raw, slug } = await params;
  const id = threadId(raw);
  if (!id) notFound();

  const viewer = await getForumViewer();
  const result = await getThreadForViewer(id, viewer);
  if (!result) notFound();
  const { thread, hiddenFromPublic, now } = result;
  if (decodeURIComponent(slug) !== thread.slug) redirect(routes.thread(thread.id, thread.slug));

  const [category, flags, votes] = await Promise.all([
    getCategoryById(thread.categoryId),
    getFlags(),
    getMyVotes(viewer, { threads: [thread.id], posts: thread.posts.map((post) => post.id) }),
  ]);
  if (!category) notFound();

  return (
    <ThreadView
      thread={thread}
      category={category}
      viewer={viewer}
      votes={votes}
      flags={flags}
      hiddenFromPublic={hiddenFromPublic}
      now={now}
    />
  );
}
