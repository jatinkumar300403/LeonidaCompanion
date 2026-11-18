/** Display formatters. Pure and locale-stable so server and client render the same text. */

/** 999 → "999", 1200 → "1.2k", 15300 → "15k", 1_250_000 → "1.3M" */
export function formatCount(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs < 1000) return `${value}`;
  const [divisor, suffix] = abs >= 1_000_000 ? [1_000_000, "M"] : [1000, "k"];
  const scaled = abs / divisor;
  const text = scaled >= 10 ? Math.round(scaled).toString() : (Math.round(scaled * 10) / 10).toString();
  return `${sign}${text}${suffix}`;
}

/** Seconds → "m:ss" (24 → "0:24", 75 → "1:15"). */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "just now", "5m ago", "2h ago", "3d ago", then "12 Nov". */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const diffSeconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (diffSeconds < 60) return "just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate.format(then);
}

/** "https://www.example.com/path" → "example.com"; invalid input → null. */
export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "lose-wanted-level-fast" → "Lose wanted level fast" */
export function humanizeSlug(slug: string): string {
  const text = decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** "permanently" or "until 20 Nov 2026, 10:00 UTC" (bans, D-083). UTC so server and browser agree. */
export function formatBanEnd(until: string | null): string {
  if (!until) return "permanently";
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return "permanently";
  const text = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return `until ${text} UTC`;
}
