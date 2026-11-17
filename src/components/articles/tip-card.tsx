import type { Route } from "next";
import Link from "next/link";
import { ShieldCheck, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SPOILER_LEVELS, tagLabel } from "@/config/tags";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { TipSummary } from "@/types/content";

/** Tip: title, one-line summary, tags, "helpful" count and a spoiler-free tick (SPEC §2). */
export function TipCard({ tip, href, className }: { tip: TipSummary; href?: Route; className?: string }) {
  const spoilerFree = tip.spoilerLevel === "none";

  return (
    <Card accent interactive className={cn("p-5", className)}>
      <article className="flex h-full flex-col">
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold">
          <Link href={href ?? routes.tip(tip.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {tip.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{tip.summary}</p>

        {tip.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {tip.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Badge variant="tag" size="sm">
                  {tagLabel(tag)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            <span className="font-semibold tabular-nums">{formatCount(tip.helpfulCount)}</span>
            <span>found this helpful</span>
          </span>
          {spoilerFree ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-text">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Spoiler-free
            </span>
          ) : (
            <Badge variant="pink" size="sm">
              {SPOILER_LEVELS[tip.spoilerLevel]}
            </Badge>
          )}
        </div>
      </article>
    </Card>
  );
}
