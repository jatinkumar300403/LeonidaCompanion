import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, ShieldAlert } from "lucide-react";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { ClipReportButton } from "@/components/clips/clip-report-button";
import { ClipVote, ClipVoteScope } from "@/components/clips/clip-vote";
import { JsonLd } from "@/components/shared/json-ld";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { clipCategoryLabel } from "@/config/tags";
import { toIsoDuration } from "@/lib/clips/duration";
import { PLATFORM_LABELS, publicEmbedUrl, serverParentHosts } from "@/lib/clips/embed";
import { formatDuration } from "@/lib/format";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, clipVideoJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import { getClip } from "@/server/clips/queries";

/**
 * /clips/[id] (SPEC §1, §6): one approved clip, shareable. ISR: built on first visit and kept for
 * 5 minutes, refreshed at once when a mod reviews it or someone votes (tag clip:<id>, D-073).
 * Pending, rejected and removed clips are a plain 404.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

function clipId(raw: string): number | null {
  const id = Number(raw);
  return /^\d{1,15}$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/clips/[id]">): Promise<Metadata> {
  const id = clipId((await params).id);
  const clip = id ? await getClip(id) : null;
  if (!clip) return buildMetadata({ title: "Clip not found", path: "/clips", noindex: true });
  const credit = clip.creatorName ? ` by ${clip.creatorName}` : "";
  return buildMetadata({
    title: clip.title,
    section: "Clips",
    path: routes.clip(clip.id),
    description:
      `${clipCategoryLabel(clip.category)} GTA 6 clip${credit} on ${PLATFORM_LABELS[clip.platform]}.${clip.caption ? ` ${clip.caption.replace(/\|\|/g, "")}` : ""}`.slice(
        0,
        160,
      ),
    image: ogImagePath(clip.title, "Clips"),
  });
}

export default async function ClipPage({ params }: PageProps<"/clips/[id]">) {
  const id = clipId((await params).id);
  const clip = id ? await getClip(id) : null;
  if (!clip) notFound();

  const platform = PLATFORM_LABELS[clip.platform];
  const path = routes.clip(clip.id);
  const absolute = (p: string) => new URL(p, siteConfig.url).toString();
  const siteHost = new URL(siteConfig.url).hostname;

  return (
    <div className="page-container max-w-4xl py-8 sm:py-12">
      <JsonLd
        data={clipVideoJsonLd({
          title: clip.title,
          description:
            clip.caption?.replace(/\|\|/g, "") || `${clipCategoryLabel(clip.category)} GTA 6 clip on ${platform}.`,
          url: absolute(path),
          embedUrl: publicEmbedUrl(clip.platform, clip.embedId, siteHost),
          thumbnailUrl: clip.thumbnailUrl ?? absolute(ogImagePath(clip.title, "Clips")),
          uploadDate: clip.approvedAt ?? clip.createdAt,
          durationIso: clip.durationSec ? toIsoDuration(clip.durationSec) : null,
          creator: clip.creatorName ? { name: clip.creatorName, url: clip.creatorUrl } : null,
          upvoteCount: clip.score,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: siteConfig.name, url: siteConfig.url },
          { name: "Clips", url: absolute("/clips") },
          { name: clip.title, url: absolute(path) },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex min-w-0 items-center gap-1">
          <li>
            <Link href="/clips" className="hover:text-foreground">
              Clips
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="min-w-0 truncate text-foreground">
            {clip.title}
          </li>
        </ol>
      </nav>

      <ClipEmbed clip={clip} parentHosts={serverParentHosts(siteConfig.hosts)} priority className="mt-4" />

      <header className="mt-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="pink" size="sm">
            {clipCategoryLabel(clip.category)}
          </Badge>
          <span>{platform}</span>
          {clip.durationSec ? <span className="tabular-nums">{formatDuration(clip.durationSec)}</span> : null}
          {clip.approvedAt ? (
            <span>
              added <RelativeTime date={clip.approvedAt} />
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold break-words sm:text-3xl">{clip.title}</h1>
      </header>

      {clip.caption ? <MarkdownRenderer source={clip.caption} size="sm" className="mt-3" /> : null}

      <section
        aria-label="Creator"
        className="mt-5 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="min-w-0 text-sm">
          <span className="text-muted-foreground">Clip by </span>
          {clip.creatorName ? (
            clip.creatorUrl ? (
              <a href={clip.creatorUrl} rel="noopener noreferrer" className="font-semibold break-words hover:underline">
                {clip.creatorName}
              </a>
            ) : (
              <span className="font-semibold">{clip.creatorName}</span>
            )
          ) : (
            <span className="font-semibold">its creator on {platform}</span>
          )}
          {clip.submitterUsername ? (
            <span className="block text-muted-foreground sm:inline">
              {" "}
              · shared by{" "}
              <Link href={routes.user(clip.submitterUsername)} className="hover:underline">
                @{clip.submitterUsername}
              </Link>
            </span>
          ) : null}
        </p>
        <Button asChild variant="secondary" className="shrink-0">
          <a href={clip.url} rel="noopener noreferrer">
            Watch on {platform}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ClipVoteScope clipIds={[clip.id]}>
          <ClipVote clipId={clip.id} score={clip.score} submittedBy={clip.submittedBy} returnTo={path} />
        </ClipVoteScope>
        <div className="flex flex-wrap items-center gap-1">
          <ClipReportButton clipId={clip.id} returnTo={path} />
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.clipRemoval(clip.id)}>
              <ShieldAlert aria-hidden="true" />
              I&apos;m the creator: remove this
            </Link>
          </Button>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Clips belong to their creators and play through {platform}&apos;s official player; nothing is re-uploaded.
      </p>
    </div>
  );
}
