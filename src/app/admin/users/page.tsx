import type { Metadata, Route } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/headers";
import { RelativeTime } from "@/components/shared/relative-time";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/config/auth";
import { integrations } from "@/env";
import { formatBanEnd } from "@/lib/format";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { userSearchTerm } from "@/lib/validation/moderation";
import { searchUsers } from "@/server/admin/users";
import { requireRole } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Users",
    path: "/admin/users",
    noindex: true,
    description: "Find and manage members.",
  });
}

const pill = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
    active
      ? "border-pink/50 bg-pink/12 text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

/** SPEC §10 users: search by username or display name, see role, reputation and bans. Staff only. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireRole("mod", "/admin/users");
  const params = await searchParams;
  const term = userSearchTerm(params.q);
  const bannedOnly = params.banned === "1";
  const users = integrations.supabaseAdmin ? await searchUsers({ term, bannedOnly }) : [];
  const listHref = (banned: boolean) => {
    const query = new URLSearchParams();
    if (term) query.set("q", term);
    if (banned) query.set("banned", "1");
    const search = query.toString();
    return (search ? `/admin/users?${search}` : "/admin/users") as Route;
  };

  return (
    <div className="page-container py-8 sm:py-10">
      <PageHeader eyebrow="Admin" title="Users" description="Search by username or display name. Newest first." />

      <form action="/admin/users" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search users
        </label>
        <Input id="user-search" name="q" defaultValue={term} placeholder="Username or name" className="h-11" />
        {bannedOnly ? <input type="hidden" name="banned" value="1" /> : null}
        <Button type="submit" size="lg">
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>
      <nav aria-label="Filter" className="mt-3 flex gap-2">
        <Link href={listHref(false)} aria-current={!bannedOnly ? "page" : undefined} className={pill(!bannedOnly)}>
          Everyone
        </Link>
        <Link href={listHref(true)} aria-current={bannedOnly ? "page" : undefined} className={pill(bannedOnly)}>
          Banned
        </Link>
      </nav>

      {users.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Users}
          title={term ? "No one matches" : bannedOnly ? "Nobody is banned" : "No users yet"}
          description={term ? "Try part of the username." : undefined}
        />
      ) : (
        <ul className="mt-6 flex flex-col divide-y rounded-xl border bg-card">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/users/${user.id}` as Route}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-accent sm:p-4"
              >
                <span className="font-semibold">@{user.username}</span>
                {user.displayName ? <span className="text-sm text-muted-foreground">{user.displayName}</span> : null}
                <span className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {user.role !== "user" ? (
                    <Badge variant="violet" size="sm">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  ) : null}
                  {user.banned ? (
                    <Badge variant="destructive" size="sm">
                      Banned {formatBanEnd(user.bannedUntil)}
                    </Badge>
                  ) : null}
                  <span className="font-mono tabular-nums">{user.reputation} rep</span>
                  <span>
                    joined <RelativeTime date={user.createdAt} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
