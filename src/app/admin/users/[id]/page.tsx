import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ActionLog } from "@/components/admin/action-log";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";
import { PageHeader } from "@/components/shared/headers";
import { RelativeTime } from "@/components/shared/relative-time";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/config/auth";
import { integrations } from "@/env";
import { formatBanEnd } from "@/lib/format";
import { threadHref } from "@/lib/notifications/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { uuidSchema } from "@/lib/validation/moderation";
import { getUserActivity } from "@/server/admin/users";
import { requireRole } from "@/server/auth/session";
import { listRecentActions } from "@/server/moderation/queries";

export async function generateMetadata({ params }: PageProps<"/admin/users/[id]">): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({ title: "User", path: `/admin/users/${id}`, noindex: true, description: "Member details." });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</dd>
    </Card>
  );
}

/** SPEC §10 user view: activity, moderation history, ban/unban and (admins) role. Staff only. */
export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const session = await requireRole("mod", `/admin/users/${id}`);
  if (!uuidSchema.safeParse(id).success || !integrations.supabaseAdmin) notFound();
  const [activity, history] = await Promise.all([getUserActivity(id), listRecentActions({ subjectId: id, limit: 30 })]);
  if (!activity) notFound();
  const { user, counts } = activity;

  return (
    <div className="page-container py-8 sm:py-10">
      <Link
        href={"/admin/users" as Route}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All users
      </Link>
      <PageHeader
        className="mt-3"
        eyebrow="User"
        title={`@${user.username}`}
        description={
          <span className="flex flex-wrap items-center gap-2 text-base">
            {user.displayName ? <span>{user.displayName}</span> : null}
            <Badge variant={user.role === "user" ? "tag" : "violet"} size="sm">
              {ROLE_LABELS[user.role]}
            </Badge>
            {user.banned ? (
              <Badge variant="destructive" size="sm">
                Banned {formatBanEnd(user.bannedUntil)}
              </Badge>
            ) : null}
            <span className="text-sm">
              {user.reputation} rep · joined <RelativeTime date={user.createdAt} />
            </span>
          </span>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="text-lg font-semibold">
              Activity
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Threads" value={counts.threads} />
              <Stat label="Replies" value={counts.posts} />
              <Stat label="Clips" value={counts.clips} />
              <Stat label="Reports filed" value={counts.reportsFiled} />
              <Stat label="Reports on profile" value={counts.reportsAgainst} />
            </dl>
          </section>

          {user.bio ? (
            <section aria-labelledby="bio-heading">
              <h2 id="bio-heading" className="text-lg font-semibold">
                Bio
              </h2>
              <p className="mt-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">{user.bio}</p>
            </section>
          ) : null}

          <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
            <h2 id="recent-heading" className="text-lg font-semibold">
              Recent content
            </h2>
            {activity.threads.length + activity.posts.length + activity.clips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border bg-card text-sm">
                {activity.threads.map((thread) => (
                  <li key={`t${thread.id}`} className="flex flex-wrap items-center gap-2 p-3">
                    <Badge variant="teal" size="sm">
                      Thread
                    </Badge>
                    <Link
                      href={threadHref(thread.id, thread.slug)}
                      className="min-w-0 font-medium break-words hover:underline"
                    >
                      {thread.title}
                    </Link>
                    <span className="ml-auto text-muted-foreground">
                      {thread.status} · <RelativeTime date={thread.createdAt} />
                    </span>
                  </li>
                ))}
                {activity.posts.map((post) => (
                  <li key={`p${post.id}`} className="flex flex-wrap items-center gap-2 p-3">
                    <Badge variant="secondary" size="sm">
                      Reply
                    </Badge>
                    <Link
                      href={threadHref(post.threadId, null, post.id)}
                      className="min-w-0 break-words text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {post.excerpt}
                    </Link>
                    <span className="ml-auto text-muted-foreground">
                      {post.status} · <RelativeTime date={post.createdAt} />
                    </span>
                  </li>
                ))}
                {activity.clips.map((clip) => (
                  <li key={`c${clip.id}`} className="flex flex-wrap items-center gap-2 p-3">
                    <Badge variant="pink" size="sm">
                      Clip
                    </Badge>
                    <span className="min-w-0 break-words">{clip.title}</span>
                    <span className="ml-auto text-muted-foreground">
                      {clip.status} · <RelativeTime date={clip.createdAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="history-heading" className="flex flex-col gap-3">
            <h2 id="history-heading" className="text-lg font-semibold">
              Moderation history
            </h2>
            <ActionLog rows={history} />
          </section>
        </div>

        <aside aria-labelledby="manage-heading" className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4">
            <h2 id="manage-heading" className="font-semibold">
              Manage
            </h2>
            <UserAdminPanel
              user={{ id: user.id, username: user.username, role: user.role, banned: user.banned }}
              viewer={{ id: session.userId, role: session.profile.role }}
            />
            <Link
              href={routes.user(user.username)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Public profile
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
