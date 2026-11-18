import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Trophy, Upload } from "lucide-react";
import { ClipCard } from "@/components/clips/clip-card";
import { ClipVoteScope } from "@/components/clips/clip-vote";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { CLIP_CATEGORIES, clipCategoryLabel } from "@/config/tags";
import { CLIP_SORT_LABELS, CLIP_SORTS, clipsListHref, parseClipListState } from "@/lib/clips/feed";
import { parseWeekKey, weekLabel } from "@/lib/clips/week";
import { buildMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getLatestWeekKey, listClips } from "@/server/clips/queries";

/**
 * /clips (SPEC §1, §6): approved clips through official embeds only. Category filter, Hot · New ·
 * Top this week, real "Newer / Older" links. Renders per request (it reads the URL) over data
 * cached for 60 s (D-073); votes come from the browser.
 */
export async function generateMetadata({ searchParams }: PageProps<"/clips">): Promise<Metadata> {
  const state = parseClipListState(await searchParams);
  const title = state.category ? `${clipCategoryLabel(state.category)} clips` : "Clips";
  return buildMetadata({
    title,
    section: state.category ? "Clips" : undefined,
    // Sorted and paged views point at the (category) list; page 2+ stays out of the index.
    path: clipsListHref({ category: state.category }),
    description: "Funny, epic and fail-worthy GTA 6 moments from streamers and players, shown through official embeds.",
    noindex: state.page > 1,
  });
}

const chip = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-pink/50 bg-pink/12 text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

export default async function ClipsPage({ searchParams }: PageProps<"/clips">) {
  const state = parseClipListState(await searchParams);
  const [page, latestWeek] = await Promise.all([listClips(state), getLatestWeekKey()]);
  const week = latestWeek ? parseWeekKey(latestWeek) : null;
  const submit = (
    <Button asChild>
      <Link href="/clips/submit">
        <Upload aria-hidden="true" />
        Submit a clip
      </Link>
    </Button>
  );

  return (
    <div className="page-container py-8 sm:py-12">
      <PageHeader
        eyebrow="Clips"
        title="GTA 6 clips"
        description="Funny, epic and fail-worthy moments, shown through the platforms' own players. Every clip credits its creator."
        actions={
          <>
            {submit}
            {latestWeek && week ? (
              <Button asChild variant="secondary">
                <Link href={routes.clipsWeek(latestWeek)}>
                  <Trophy aria-hidden="true" />
                  Top 10 · {weekLabel(week)}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mt-8 flex flex-col gap-3">
        <nav aria-label="Clip categories" className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href={clipsListHref({ sort: state.sort })}
            aria-current={state.category === null ? "page" : undefined}
            className={chip(state.category === null)}
          >
            All
          </Link>
          {CLIP_CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={clipsListHref({ category: category.value, sort: state.sort })}
              aria-current={state.category === category.value ? "page" : undefined}
              className={chip(state.category === category.value)}
            >
              {category.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Sort clips" className="flex gap-1 border-b">
          {CLIP_SORTS.map((sort) => (
            <Link
              key={sort}
              href={clipsListHref({ category: state.category, sort })}
              aria-current={state.sort === sort ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                state.sort === sort
                  ? "border-pink text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {CLIP_SORT_LABELS[sort]}
            </Link>
          ))}
        </nav>
      </div>

      {page.items.length > 0 ? (
        <ClipVoteScope clipIds={page.items.map((clip) => clip.id)}>
          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {page.items.map((clip, index) => (
              <li key={clip.id} className="min-w-0">
                <ClipCard clip={clip} votes priority={index < 2} className="h-full" />
              </li>
            ))}
          </ul>
        </ClipVoteScope>
      ) : (
        <EmptyState
          className="mt-6"
          icon={Clapperboard}
          title={
            state.page > 1
              ? "No more clips here"
              : state.sort === "top"
                ? "No top clips this week yet"
                : state.category
                  ? `No ${clipCategoryLabel(state.category).toLowerCase()} clips yet`
                  : "Clips arrive with launch"
          }
          description="We only show clips through official Twitch, YouTube and TikTok embeds, and always credit the creator. Seen a great one?"
          actions={submit}
        />
      )}

      {state.page > 1 || page.hasMore ? (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-2 text-sm">
          {state.page > 1 ? (
            <Link href={clipsListHref({ ...state, page: state.page - 1 })} className="link-dusk" rel="prev">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">Page {state.page}</span>
          {page.hasMore ? (
            <Link href={clipsListHref({ ...state, page: state.page + 1 })} className="link-dusk" rel="next">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
