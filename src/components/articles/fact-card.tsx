import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/articles/status-badge";
import { Card } from "@/components/ui/card";
import { hostnameOf } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { FactSummary } from "@/types/content";

/** Fact: status badge, the fact sentence and its source domain (SPEC §2, rule 7). */
export function FactCard({ fact, className }: { fact: FactSummary; className?: string }) {
  const domain = fact.sourceUrl ? hostnameOf(fact.sourceUrl) : null;

  return (
    <Card interactive className={cn("p-5", className)}>
      <article className="flex h-full flex-col gap-3">
        <StatusBadge status={fact.status} />
        <p className="line-clamp-4 text-base leading-relaxed font-medium">
          <Link href={routes.fact(fact.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {fact.statement}
          </Link>
        </p>
        {domain && fact.sourceUrl ? (
          <a
            href={fact.sourceUrl}
            rel="noopener noreferrer"
            className="relative z-10 mt-auto inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>Source: {domain}</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="mt-auto text-xs text-muted-foreground">Source in the article</span>
        )}
      </article>
    </Card>
  );
}
