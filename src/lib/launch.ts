/**
 * Countdown maths for CountdownOrStatus. LAUNCH_AT has no offset (D-020), so the exact launch
 * instant depends on the viewer's time zone and is only known in the browser.
 */

export type LaunchState =
  { status: "upcoming"; days: number; hours: number; minutes: number; seconds: number } | { status: "out" };

/** Parses "YYYY-MM-DDTHH:mm:ss" as local time in the current runtime's time zone. */
export function parseLaunchAt(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid launch date: ${value}`);
  return date;
}

export function getLaunchState(now: Date, launchAt: Date): LaunchState {
  const remaining = launchAt.getTime() - now.getTime();
  if (remaining <= 0) return { status: "out" };
  const totalSeconds = Math.ceil(remaining / 1000);
  return {
    status: "upcoming",
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Earliest (UTC+14) and latest (UTC−12) moments that a local-midnight launch can happen. */
export function launchWindowUtc(localLaunchAt: string): { earliest: number; latest: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(localLaunchAt);
  if (!match) throw new Error(`Launch date must look like YYYY-MM-DDTHH:mm:ss, got ${localLaunchAt}`);
  const [, y, mo, d, h, mi, s] = match.map(Number);
  const wallClockAsUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  return { earliest: wallClockAsUtc - 14 * 3_600_000, latest: wallClockAsUtc + 12 * 3_600_000 };
}

/**
 * What the server can safely render before the browser knows the viewer's time zone:
 * "upcoming" or "out" when that holds in every time zone, otherwise "unknown".
 */
export function serverLaunchHint(nowMs: number, localLaunchAt: string): "upcoming" | "out" | "unknown" {
  const { earliest, latest } = launchWindowUtc(localLaunchAt);
  if (nowMs < earliest) return "upcoming";
  if (nowMs >= latest) return "out";
  return "unknown";
}
