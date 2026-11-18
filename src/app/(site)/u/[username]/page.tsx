import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Gamepad2, MessagesSquare, Pencil } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformLabel, ROLE_LABELS } from "@/config/auth";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { ProfileSafety } from "@/components/forum/profile-safety";
import { getSession } from "@/server/auth/session";
import { getUserThreads } from "@/server/forum/queries";
import { getForumViewer } from "@/server/forum/viewer";
import { ThreadRow } from "@/components/forum/thread-row";
import { Card } from "@/components/ui/card";
import { getPublicProfile } from "@/server/profiles/queries";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) return buildMetadata({ title: "Profile not found", path: routes.user(username), noindex: true });
  const name = profile.displayName ? `${profile.displayName} (@${profile.username})` : `@${profile.username}`;
  const active = profile.stats.threads + profile.stats.replies + profile.stats.clips > 0;
  return buildMetadata({
    title: name,
    path: routes.user(profile.username),
    description: profile.bio?.slice(0, 160) || `${name} on the forum: threads, replies and clips.`,
    // Thin profiles stay out of search until the person has posted something.
    noindex: !active,
  });
}

const joinedFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) notFound();

  const session = await getSession();
  const isOwn = session?.userId === profile.id;
  const [viewer, threads] = await Promise.all([isOwn ? null : getForumViewer(), getUserThreads(profile.id)]);
  const platform = platformLabel(profile.platform);
  const stats = [
    { label: "Reputation", value: profile.reputation },
    { label: "Threads", value: profile.stats.threads },
    { label: "Replies", value: profile.stats.replies },
    { label: "Clips", value: profile.stats.clips },
  ];

  return (
    <div className="page-container py-8 sm:py-12">
      <section
        className="overflow-hidden rounded-[14px] border bg-surface dusk-top p-5 sm:p-8"
        aria-labelledby="profile-name"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar
            username={profile.username}
            displayName={profile.displayName}
            avatarUrl={profile.avatarUrl}
            className="size-20 sm:size-24"
            fallbackClassName="text-2xl sm:text-3xl"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="profile-name" className="truncate text-2xl font-bold sm:text-3xl">
                {profile.displayName || `@${profile.username}`}
              </h1>
              {profile.role !== "user" ? (
                <Badge variant={profile.role === "admin" ? "pink" : "violet"}>{ROLE_LABELS[profile.role]}</Badge>
              ) : null}
            </div>
            {profile.displayName ? <p className="text-muted-foreground">@{profile.username}</p> : null}
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                Joined {joinedFormat.format(new Date(profile.createdAt))}
              </li>
              {platform ? (
                <li className="inline-flex items-center gap-1.5">
                  <Gamepad2 className="size-4" aria-hidden="true" />
                  Plays on {platform}
                </li>
              ) : null}
            </ul>
          </div>
          {isOwn ? (
            <Button asChild variant="secondary" size="sm" className="self-start sm:self-center">
              <Link href="/settings">
                <Pencil aria-hidden="true" />
                Edit profile
              </Link>
            </Button>
          ) : session?.profile && !session.profile.banned ? (
            <ProfileSafety
              userId={profile.id}
              username={profile.username}
              blocked={viewer?.blocked.has(profile.id) ?? false}
            />
          ) : null}
        </div>

        {profile.bio ? <p className="mt-5 max-w-2xl whitespace-pre-line text-foreground">{profile.bio}</p> : null}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-surface-2 px-4 py-3">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</dt>
              <dd className="font-mono text-2xl font-semibold tabular-nums">{formatCount(stat.value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="activity">
        <h2 id="activity" className="text-xl font-semibold">
          Recent threads
        </h2>
        {threads.length > 0 ? (
          <Card className="mt-4">
            <ol className="divide-y">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow thread={thread} />
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <EmptyState
            className="mt-4"
            icon={MessagesSquare}
            title={isOwn ? "Nothing here yet" : `No threads from @${profile.username} yet`}
            description={isOwn ? "Threads you start show up here." : "Their threads will show up here."}
            actions={
              isOwn ? (
                <Button asChild size="sm">
                  <Link href="/forum/new">Start a thread</Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
