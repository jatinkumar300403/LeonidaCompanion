"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/format";
import { describeNotification, type NotificationView } from "@/lib/notifications/format";
import { loadBrowserSupabase } from "@/lib/supabase/browser";
import { markNotificationsRead } from "@/server/notifications/actions";

const LIST_SIZE = 15;
const REFRESH_MS = 60_000;

/**
 * The header bell (SPEC §9): unread count, the latest notifications and "Mark all read". Reads run
 * in the browser under RLS (own rows only), so cached public pages stay static; marking read goes
 * through a rate-limited Server Action. Refreshes when opened and every minute while visible.
 */
async function fetchNotifications(userId: string): Promise<{ items: NotificationView[]; unread: number } | null> {
  const supabase = await loadBrowserSupabase();
  if (!supabase) return null;
  const [list, count] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, payload, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIST_SIZE),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  if (list.error || count.error) return null;
  return { items: list.data.map(describeNotification), unread: count.count ?? 0 };
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    () =>
      fetchNotifications(userId).then((data) => {
        setLoaded(true);
        if (!data) return;
        setItems(data.items);
        setUnread(data.unread);
      }),
    [userId],
  );

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  async function markRead(ids: "all" | number[]) {
    setItems((current) =>
      current.map((item) => (ids === "all" || ids.includes(item.id) ? { ...item, unread: false } : item)),
    );
    setUnread((current) => (ids === "all" ? 0 : Math.max(current - ids.length, 0)));
    await markNotificationsRead(ids);
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <DropdownMenu onOpenChange={(open) => (open ? void load() : undefined)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label} data-testid="notification-bell">
          <Bell aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-pink px-1 font-mono text-[0.625rem] leading-4 font-semibold text-on-accent"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={(event) => {
                event.preventDefault();
                void markRead("all");
              }}
            >
              <CheckCheck aria-hidden="true" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {loaded ? "No notifications yet. Replies and mentions show up here." : "Loading…"}
          </p>
        ) : (
          <div className="max-h-[min(26rem,70vh)] overflow-y-auto py-1">
            {items.map((item) =>
              item.href ? (
                <DropdownMenuItem key={item.id} asChild className="items-start gap-2 px-3 py-2">
                  <Link href={item.href} onClick={() => (item.unread ? void markRead([item.id]) : undefined)}>
                    <NotificationLine item={item} />
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.id}
                  className="items-start gap-2 px-3 py-2"
                  onSelect={() => (item.unread ? void markRead([item.id]) : undefined)}
                >
                  <NotificationLine item={item} />
                </DropdownMenuItem>
              ),
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationLine({ item }: { item: NotificationView }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? "bg-pink" : "bg-transparent"}`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm leading-snug ${item.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}
        >
          {item.text}
          {item.unread ? <span className="sr-only"> (unread)</span> : null}
        </span>
        <time dateTime={item.createdAt} className="mt-0.5 block text-xs text-muted-foreground">
          {formatRelativeTime(new Date(item.createdAt))}
        </time>
      </span>
    </>
  );
}
