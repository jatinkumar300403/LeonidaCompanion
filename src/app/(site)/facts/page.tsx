import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { StatusBadge } from "@/components/articles/status-badge";
import { StubPage } from "@/components/shared/stub-page";
import { FACT_STATUSES, type FactStatus } from "@/config/tags";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Facts",
    path: "/facts",
    description: "Confirmed GTA 6 info, trivia and easter eggs. Every fact carries a status and a source.",
  });
}

export default function FactsPage() {
  return (
    <StubPage
      eyebrow="Facts"
      title="GTA 6 facts"
      description="Confirmed info, trivia and easter eggs. Every fact carries a status badge and a source."
      icon={BadgeCheck}
      emptyTitle="No facts published yet"
      emptyDescription="Facts only go up with a source. Rumours never do."
      links={[{ href: "/ask", label: "Ask AI", primary: true }]}
    >
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
    </StubPage>
  );
}
