import type { Metadata, Route } from "next";
import Link from "next/link";
import { FileText, Lightbulb, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/headers";
import { RelativeTime } from "@/components/shared/relative-time";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ARTICLE_STATUS_LABELS,
  ARTICLE_STATUSES,
  ARTICLE_TYPE_INFO,
  ARTICLE_TYPES,
  type ArticleStatus,
} from "@/config/articles";
import { buildMetadata } from "@/lib/seo/metadata";
import { ADMIN_PAGE_SIZE, listAdminArticles, normalizeAdminFilter } from "@/server/articles/admin-queries";
import { requireRole } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Articles", path: "/admin/articles", noindex: true, description: "Manage articles." });
}

const STATUS_VARIANT: Record<ArticleStatus, "secondary" | "teal" | "violet" | "outline"> = {
  draft: "secondary",
  review: "violet",
  published: "teal",
  archived: "outline",
};

/** Published with a future date: waiting for the scheduled-publish cron. */
function isScheduled(status: ArticleStatus, publishedAt: string | null): boolean {
  return status === "published" && publishedAt !== null && Date.parse(publishedAt) > Date.now();
}

const selectClass =
  "h-10 rounded-[10px] border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/** SPEC §10 Articles: list with filters, big Quick tip / New article buttons. Admin only. */
export default async function AdminArticlesPage({ searchParams }: PageProps<"/admin/articles">) {
  await requireRole("admin", "/admin/articles");
  const params = await searchParams;
  const filter = normalizeAdminFilter(params);
  const { rows, total } = await listAdminArticles(filter);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (filter.type) query.set("type", filter.type);
    if (filter.status) query.set("status", filter.status);
    if (filter.q) query.set("q", filter.q);
    if (page > 1) query.set("page", String(page));
    const qs = query.toString();
    return (qs ? `/admin/articles?${qs}` : "/admin/articles") as Route;
  };

  return (
    <div className="page-container py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Articles"
        description={`${total} article${total === 1 ? "" : "s"}`}
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/admin/articles/new?type=tip&mode=quick">
                <Lightbulb aria-hidden="true" />
                Quick tip
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/admin/articles/new">
                <Plus aria-hidden="true" />
                New article
              </Link>
            </Button>
          </>
        }
      />

      <form method="get" className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" role="search">
        <div className="flex flex-col gap-1 sm:w-64">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search titles
          </label>
          <Input id="q" name="q" defaultValue={filter.q} placeholder="Search…" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <select id="type" name="type" defaultValue={filter.type ?? ""} className={selectClass}>
              <option value="">All types</option>
              {ARTICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ARTICLE_TYPE_INFO[type].label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select id="status" name="status" defaultValue={filter.status ?? ""} className={selectClass}>
              <option value="">All statuses</option>
              {ARTICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ARTICLE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" variant="secondary">
          <Search aria-hidden="true" />
          Filter
        </Button>
      </form>

      {rows.length > 0 ? (
        <ul className="mt-6 divide-y rounded-xl border bg-card">
          {rows.map((row) => {
            const scheduled = isScheduled(row.status, row.publishedAt);
            return (
              <li key={row.id}>
                <Link
                  href={`/admin/articles/${row.id}` as Route}
                  className="flex flex-col gap-1.5 px-4 py-3.5 hover:bg-accent sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">{row.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {ARTICLE_TYPE_INFO[row.type].label} · /{row.slug} · edited <RelativeTime date={row.updatedAt} />
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {scheduled ? (
                      <Badge variant="orange">Scheduled</Badge>
                    ) : (
                      <Badge variant={STATUS_VARIANT[row.status]}>{ARTICLE_STATUS_LABELS[row.status]}</Badge>
                    )}
                    {row.spoilerLevel !== "none" ? <Badge variant="pink">Spoilers</Badge> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          className="mt-6"
          icon={FileText}
          title="No articles match"
          description="Write a quick tip, or clear the filters."
          actions={
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/articles">Clear filters</Link>
            </Button>
          }
        />
      )}

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-2 text-sm">
          {filter.page > 1 ? (
            <Link href={pageHref(filter.page - 1)} className="link-dusk">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {filter.page} of {pages}
          </span>
          {filter.page < pages ? (
            <Link href={pageHref(filter.page + 1)} className="link-dusk">
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
