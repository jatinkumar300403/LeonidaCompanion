import type { Metadata, Route } from "next";
import Link from "next/link";
import { ActionLog } from "@/components/admin/action-log";
import { AiStatusBanner } from "@/components/admin/ai-status-banner";
import { HeldQueue } from "@/components/admin/held-queue";
import { ReportQueue } from "@/components/admin/report-queue";
import { PageHeader } from "@/components/shared/headers";
import { REPORT_REASONS } from "@/config/forum";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { parseModerationParams, type ActionFilter, type ModerationTab } from "@/lib/validation/moderation";
import { requireRole } from "@/server/auth/session";
import { getCategories } from "@/server/forum/queries";
import { listHeld, listOpenReports, listRecentActions, queueCounts } from "@/server/moderation/queries";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Moderation",
    path: "/admin/moderation",
    noindex: true,
    description: "Held posts, reports and the moderation log.",
  });
}

const TAB_LABELS: Record<ModerationTab, string> = { held: "Held", reports: "Reports", actions: "Recent actions" };
const FILTER_LABELS: Record<ActionFilter, string> = { all: "All", human: "Moderators", ai: "AI" };

const pill = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-pink/50 bg-pink/12 text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

function href(tab: ModerationTab, filter?: ActionFilter): Route {
  const params = new URLSearchParams();
  if (tab !== "held") params.set("tab", tab);
  if (filter && filter !== "all") params.set("who", filter);
  const search = params.toString();
  return (search ? `/admin/moderation?${search}` : "/admin/moderation") as Route;
}

const REASON_LABELS: Record<string, string> = {
  ...Object.fromEntries(REPORT_REASONS.map((reason) => [reason.value, reason.label])),
  copyright: "Copyright",
};

/** SPEC §10 moderation queue: Held · Reports · Recent actions. Staff only. */
export default async function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  await requireRole("mod", "/admin/moderation");
  const { tab, filter } = parseModerationParams(await searchParams);
  const counts = await queueCounts();

  return (
    <div className="page-container py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Moderation"
        description="Held posts wait for a decision; reports come from members. Every action is logged."
      />
      <AiStatusBanner className="mt-6" />

      <nav aria-label="Moderation queues" className="mt-6 flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
        {(Object.keys(TAB_LABELS) as ModerationTab[]).map((key) => {
          const count = key === "held" ? counts.held : key === "reports" ? counts.reports : null;
          return (
            <Link
              key={key}
              href={href(key)}
              aria-current={tab === key ? "page" : undefined}
              className={pill(tab === key)}
            >
              {TAB_LABELS[key]}
              {count !== null ? (
                <span className="rounded-full bg-surface-2 px-1.5 font-mono text-xs tabular-nums">{count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "held" ? <HeldTab /> : tab === "reports" ? <ReportsTab /> : <ActionsTab filter={filter} />}
    </div>
  );
}

async function HeldTab() {
  const items = await listHeld();
  return <HeldQueue key={items.map((item) => item.key).join(",")} items={items} className="mt-6" />;
}

async function ReportsTab() {
  const [groups, categories] = await Promise.all([listOpenReports(), getCategories()]);
  return (
    <ReportQueue
      key={groups.map((group) => group.key).join(",")}
      groups={groups}
      categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      reasonLabels={REASON_LABELS}
      className="mt-6"
    />
  );
}

async function ActionsTab({ filter }: { filter: ActionFilter }) {
  const rows = await listRecentActions({ filter });
  return (
    <>
      <nav aria-label="Who acted" className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as ActionFilter[]).map((key) => (
          <Link
            key={key}
            href={href("actions", key)}
            aria-current={filter === key ? "page" : undefined}
            className={cn(pill(filter === key), "h-8 px-3 text-xs")}
          >
            {FILTER_LABELS[key]}
          </Link>
        ))}
      </nav>
      <ActionLog rows={rows} className="mt-4" />
    </>
  );
}
