import Link from "next/link";
import { ArrowBigUp, ExternalLink } from "lucide-react";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { clipCategoryLabel } from "@/config/tags";
import { PLATFORM_LABELS } from "@/lib/clips/embed";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ClipSummary } from "@/types/content";

/**
 * Clip with its facade embed, title, category and creator credit + "Watch on <platform>"
 * (SPEC §6: always credit the creator, link to their channel).
 */
export function ClipCard({
  clip,
  priority = false,
  initialStage,
  className,
}: {
  clip: ClipSummary;
  priority?: boolean;
  initialStage?: "idle" | "consent" | "playing";
  className?: string;
}) {
  const platform = PLATFORM_LABELS[clip.platform];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <ClipEmbed
        clip={clip}
        parentHosts={siteConfig.hosts}
        priority={priority}
        initialStage={initialStage}
        className="rounded-none border-0 border-b"
      />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-snug font-semibold">
            <Link href={routes.clip(clip.id)} className="link-dusk">
              {clip.title}
            </Link>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-sm text-muted-foreground tabular-nums">
            <ArrowBigUp className="size-4" aria-hidden="true" />
            {formatCount(clip.score)}
            <span className="sr-only"> votes</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          <Badge variant="pink" size="sm">
            {clipCategoryLabel(clip.category)}
          </Badge>
          <span>
            by{" "}
            <a href={clip.creatorUrl} rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              {clip.creatorName}
            </a>
          </span>
          <a
            href={clip.url}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
          >
            Watch on {platform}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Card>
  );
}
