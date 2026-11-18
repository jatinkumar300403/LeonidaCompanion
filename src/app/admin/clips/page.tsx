import type { Metadata, Route } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { ClipReviewQueue } from "@/components/clips/clip-review-queue";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { siteConfig } from "@/config/site";
import { serverParentHosts } from "@/lib/clips/embed";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { listReviewQueue, parseQueueFilter, QUEUE_STATUSES, type QueueFilter } from "@/server/clips/admin-queries";
import type { ClipSource, ClipStatus } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Clips queue", path: "/admin/clips", noindex: true, description: "Review clips." });
}

const STATUS_LABELS: Record<ClipStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  removed: "Removed",
};

const SOURCE_LABELS: Record<"all" | ClipSource, string> = { all: "All", user: "Members", twitch_auto: "Twitch auto" };

function queueHref(filter: QueueFilter): Route {
  const params = new URLSearchParams();
  if (filter.status !== "pending") params.set("status", filter.status);
  if (filter.source) params.set("source", filter.source);
  const search = params.toString();
  return (search ? `/admin/clips?${search}` : "/admin/clips") as Route;
}

const pill = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-pink/50 bg-pink/12 text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

/** SPEC §10 clips queue: pending (members + Twitch auto), embed preview in place, one-tap review. Staff only. */
export default async function AdminClipsPage({ searchParams }: PageProps<"/admin/clips">) {
  await requireRole("mod", "/admin/clips");
  const filter = parseQueueFilter(await searchParams);
  const { items, total } = await listReviewQueue(filter);

  return (
    <div className="page-container py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Clips"
        description={
          filter.status === "pending"
            ? `${total} waiting for review. Check it's GTA VI, not a story spoiler or cutscene, and under a minute.`
            : `${total} ${STATUS_LABELS[filter.status].toLowerCase()}`
        }
      />

      <nav aria-label="Clip status" className="mt-6 flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
        {QUEUE_STATUSES.map((status) => (
          <Link
            key={status}
            href={queueHref({ ...filter, status })}
            aria-current={filter.status === status ? "page" : undefined}
            className={pill(filter.status === status)}
          >
            {STATUS_LABELS[status]}
          </Link>
        ))}
      </nav>
      <nav aria-label="Clip source" className="mt-3 flex flex-wrap gap-2">
        {(["all", "user", "twitch_auto"] as const).map((source) => {
          const active = (filter.source ?? "all") === source;
          return (
            <Link
              key={source}
              href={queueHref({ ...filter, source: source === "all" ? null : source })}
              aria-current={active ? "page" : undefined}
              className={cn(pill(active), "h-8 px-3 text-xs")}
            >
              {SOURCE_LABELS[source]}
            </Link>
          );
        })}
      </nav>

      {items.length > 0 ? (
        <ClipReviewQueue
          key={`${filter.status}:${filter.source ?? "all"}`}
          items={items}
          status={filter.status}
          parentHosts={serverParentHosts(siteConfig.hosts)}
          className="mt-6"
        />
      ) : (
        <EmptyState
          className="mt-6"
          icon={Clapperboard}
          title={
            filter.status === "pending" ? "Nothing to review" : `No ${STATUS_LABELS[filter.status].toLowerCase()} clips`
          }
          description={
            filter.status === "pending"
              ? "New member submissions and Twitch auto-candidates show up here."
              : "Try another tab or source."
          }
        />
      )}
    </div>
  );
}
