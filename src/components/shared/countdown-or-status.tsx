"use client";

import { useSyncExternalStore } from "react";
import { siteConfig, LAUNCH_AT } from "@/config/site";
import { getLaunchState, parseLaunchAt, type LaunchState } from "@/lib/launch";
import { cn } from "@/lib/utils";

/**
 * Countdown before launch, "Out now on PS5 & Xbox Series X|S" after (SPEC §2), computed in the
 * viewer's own time zone from LAUNCH_AT (D-020). The server can't know that time zone, so it
 * renders `serverHint` ("upcoming" → same-size placeholder boxes, "out" → the status pill) and
 * the browser takes over after hydration. Ticks once a second; nothing is announced each tick.
 */

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => null;

const LAUNCH_LABEL = "Thursday 19 November 2026";

export function CountdownOrStatus({
  launchAt = LAUNCH_AT,
  serverHint = "upcoming",
  fixedNow,
  className,
}: {
  launchAt?: string;
  /** What to render before hydration; see serverLaunchHint() in src/lib/launch.ts. */
  serverHint?: "upcoming" | "out" | "unknown";
  /** Freeze the clock (used by the /admin/ui showcase). */
  fixedNow?: number;
  className?: string;
}) {
  const liveNow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const current = fixedNow ?? liveNow;

  let state: LaunchState | null = null;
  if (current !== null) state = getLaunchState(new Date(current), parseLaunchAt(launchAt));
  else if (serverHint === "out") state = { status: "out" };

  if (state?.status === "out") {
    return (
      <p
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full border border-teal/30 bg-teal/12 px-4 py-2 text-sm font-semibold text-teal-text",
          className,
        )}
      >
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex size-full rounded-full bg-teal opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-teal" />
        </span>
        Out now on {siteConfig.platformsLabel}
      </p>
    );
  }

  const units = [
    { label: "days", value: state?.days },
    { label: "hrs", value: state?.hours },
    { label: "min", value: state?.minutes },
    { label: "sec", value: state?.seconds },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)} role="timer" aria-live="off">
      <p className="text-sm font-medium text-muted-foreground">
        <span className="sr-only">GTA VI launches on {LAUNCH_LABEL}, at midnight your time. </span>
        <span aria-hidden="true">Launches in</span>
      </p>
      <ol className="flex gap-2" aria-hidden="true">
        {units.map(({ label, value }) => (
          <li
            key={label}
            className="flex w-14 flex-col items-center rounded-lg border bg-surface/80 py-1.5 shadow-card backdrop-blur-sm"
          >
            <span className="font-mono text-xl leading-7 font-semibold tabular-nums">
              {value === undefined ? "--" : String(value).padStart(2, "0")}
            </span>
            <span className="text-[0.6875rem] text-muted-foreground uppercase">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
