"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime } from "@/lib/format";

const absolute = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const subscribe = () => () => {};

/**
 * "2h ago" on cached (ISR) pages: the server renders the date, the browser swaps in the relative
 * time after hydration, so a page cached for an hour never claims "just now".
 */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const value = new Date(date);
  return (
    <time dateTime={date} title={value.toUTCString()} className={className} suppressHydrationWarning>
      {hydrated ? formatRelativeTime(value) : absolute.format(value)}
    </time>
  );
}
