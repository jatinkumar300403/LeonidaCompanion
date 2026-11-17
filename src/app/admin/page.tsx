import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Lightbulb, Plus, Rocket } from "lucide-react";
import { PageHeader } from "@/components/shared/headers";
import { RelativeTime } from "@/components/shared/relative-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { integrations } from "@/env";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDashboardData } from "@/server/admin/dashboard";
import { requireRole } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Admin", path: "/admin", noindex: true, description: "Site administration." });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/** Admin dashboard skeleton (SPEC §10): today's counts, Ask AI rating, wiki sync and content status. */
export default async function AdminDashboardPage() {
  const { profile } = await requireRole("mod", "/admin");
  const data = integrations.supabaseAdmin ? await getDashboardData() : null;
  const isAdmin = profile.role === "admin";

  return (
    <div className="page-container py-8 sm:py-10">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="Today at a glance (UTC day). Moderation, clips and wiki screens arrive in Phases 5–7."
        actions={
          isAdmin ? (
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
          ) : null
        }
      />

      {data ? (
        <>
          <section aria-labelledby="today-heading" className="mt-8">
            <h2 id="today-heading" className="text-lg font-semibold">
              Today
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="New threads" value={data.today.threads} />
              <Stat label="New posts" value={data.today.posts} />
              <Stat label="AI questions" value={data.today.asks} />
              <Stat label="Clips pending" value={data.today.clipsPending} />
              <Stat label="Open reports" value={data.today.reportsOpen} />
            </dl>
          </section>

          <section aria-labelledby="content-heading" className="mt-8">
            <h2 id="content-heading" className="text-lg font-semibold">
              Content
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Drafts" value={data.articles.draft} />
              <Stat label="In review" value={data.articles.review} />
              <Stat label="Scheduled" value={data.articles.scheduled} />
              <Stat label="Published" value={data.articles.published} />
            </dl>
          </section>

          <section aria-labelledby="signals-heading" className="mt-8">
            <h2 id="signals-heading" className="text-lg font-semibold">
              Signals
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Ask AI 👍 rate"
                value={data.askThumbsUpRate === null ? "–" : `${Math.round(data.askThumbsUpRate * 100)}%`}
                hint={`${data.askFeedbackCount} rated answers`}
              />
              <Stat label="Top searches" value="–" hint="Search arrives after launch (Phase 12)." />
              <Card className="p-4">
                <dt className="text-xs font-medium text-muted-foreground">Last wiki sync</dt>
                <dd className="mt-1 text-sm">
                  {data.lastIngest ? (
                    <>
                      <span className="font-medium">{data.lastIngest.sourceId}</span>,{" "}
                      <RelativeTime date={data.lastIngest.startedAt} /> · {data.lastIngest.pagesChanged} pages changed
                      {data.lastIngest.finishedAt ? null : " · still running"}
                    </>
                  ) : (
                    "No sync has run yet (Phase 7)."
                  )}
                </dd>
              </Card>
            </dl>
          </section>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">The dashboard needs the Supabase secret key.</p>
      )}

      <section aria-labelledby="shortcuts-heading" className="mt-10">
        <h2 id="shortcuts-heading" className="text-lg font-semibold">
          Shortcuts
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {isAdmin ? (
            <>
              <li>
                <Link
                  href="/admin/articles"
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-accent"
                >
                  <FileText className="size-5 text-orange-text" aria-hidden="true" />
                  <span className="font-medium">All articles</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/launch"
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-accent"
                >
                  <Rocket className="size-5 text-orange-text" aria-hidden="true" />
                  <span className="font-medium">Launch Hub facts</span>
                </Link>
              </li>
            </>
          ) : (
            <li className="text-sm text-muted-foreground">Articles and the Launch Hub are admin-only.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
