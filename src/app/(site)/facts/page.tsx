import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { IndexRoute, indexMetadata, type IndexCopy } from "@/components/articles/article-routes";
import { StatusBadge } from "@/components/articles/status-badge";
import { FACT_STATUSES, type FactStatus } from "@/config/tags";

const copy: IndexCopy = {
  type: "fact",
  basePath: "/facts",
  eyebrow: "Facts",
  title: "GTA 6 facts",
  metaTitle: "GTA 6 Facts",
  description: "Confirmed info, trivia and easter eggs. Every fact carries a status badge and a source.",
  metaDescription: "Confirmed GTA 6 info, trivia and easter eggs. Every fact carries a status and a source.",
  icon: BadgeCheck,
  emptyTitle: "No facts published yet",
  emptyDescription: "Facts only go up with a source. Rumours never do.",
};

export async function generateMetadata({ searchParams }: PageProps<"/facts">): Promise<Metadata> {
  return indexMetadata(copy, searchParams);
}

export default function FactsPage({ searchParams }: PageProps<"/facts">) {
  return (
    <IndexRoute
      copy={copy}
      searchParams={searchParams}
      intro={
        <dl className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(FACT_STATUSES) as FactStatus[]).map((status) => (
            <div key={status} className="rounded-xl border bg-card p-4 shadow-card">
              <dt>
                <StatusBadge status={status} />
              </dt>
              <dd className="mt-2 text-sm text-muted-foreground">{FACT_STATUSES[status].description}.</dd>
            </div>
          ))}
        </dl>
      }
    />
  );
}
