import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Trophy } from "lucide-react";
import { ClipCard } from "@/components/clips/clip-card";
import { ClipVoteScope } from "@/components/clips/clip-vote";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { formatWeekKey, isWeekOpen, parseWeekKey, weekDates, weekLabel } from "@/lib/clips/week";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import { getWeeklyTop } from "@/server/clips/queries";

/**
 * /clips/top/[week] (SPEC §1, §6): the frozen top 10 for an ISO week, e.g. 2026-w47. The Monday
 * 06:00 UTC cron writes the snapshot; the page is static after that (ISR, tag clips-weekly).
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/clips/top/[week]">): Promise<Metadata> {
  const week = parseWeekKey(decodeURIComponent((await params).week));
  if (!week) return buildMetadata({ title: "Weekly top 10", path: "/clips", noindex: true });
  const key = formatWeekKey(week);
  const top = await getWeeklyTop(key);
  const title = `Top 10 clips · ${weekLabel(week)}`;
  return buildMetadata({
    title,
    section: "Clips",
    path: routes.clipsWeek(key),
    description: `The ten best GTA 6 clips of ${weekDates(week)}, voted by the community.`,
    image: ogImagePath(title, "Clips"),
    noindex: !top || top.clips.length === 0,
  });
}

export default async function TopClipsWeekPage({ params }: PageProps<"/clips/top/[week]">) {
  const week = parseWeekKey(decodeURIComponent((await params).week));
  if (!week) notFound();
  const key = formatWeekKey(week);
  const top = await getWeeklyTop(key);

  return (
    <div className="page-container py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/clips" className="hover:text-foreground">
              Clips
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-foreground">
            Top 10
          </li>
        </ol>
      </nav>

      <PageHeader
        className="mt-4"
        eyebrow={`Weekly top 10 · ${weekDates(week)}`}
        title={`Top 10 clips · ${weekLabel(week)}`}
        description="The highest-voted clips added that week, frozen every Monday at 06:00 UTC."
      />

      {top && top.clips.length > 0 ? (
        <ClipVoteScope clipIds={top.clips.map((clip) => clip.id)}>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {top.clips.map((clip, index) => (
              <li key={clip.id} className="min-w-0">
                <ClipCard clip={clip} votes rank={index + 1} priority={index < 2} className="h-full" />
              </li>
            ))}
          </ol>
        </ClipVoteScope>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Trophy}
          title={isWeekOpen(week) ? "This week isn't over yet" : "No top 10 for this week"}
          description={
            isWeekOpen(week)
              ? "The top 10 is frozen on Monday at 06:00 UTC. Vote for your favourites until then."
              : "No clips were added that week."
          }
          actions={
            <Button asChild variant="secondary">
              <Link href="/clips?sort=top">See this week&apos;s top clips</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
