/**
 * ISO weeks for the weekly top 10 (SPEC §6: `/clips/top/2026-w47`, frozen each Monday 06:00 UTC
 * for the previous week). Weeks start on Monday 00:00 UTC; week 1 holds the year's first Thursday.
 */

const DAY = 86_400_000;
const WEEK_KEY = /^(\d{4})-w(\d{2})$/;

export type IsoWeek = { year: number; week: number };

/** Monday 00:00 UTC of ISO week 1 of `year`. */
function week1Start(year: number): number {
  const jan4 = Date.UTC(year, 0, 4);
  const weekday = (new Date(jan4).getUTCDay() + 6) % 7; // Monday = 0
  return jan4 - weekday * DAY;
}

function weeksInYear(year: number): number {
  return Math.round((week1Start(year + 1) - week1Start(year)) / (7 * DAY));
}

export function isoWeekOf(date: Date): IsoWeek {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const weekday = (new Date(day).getUTCDay() + 6) % 7;
  const thursday = day - weekday * DAY + 3 * DAY;
  const year = new Date(thursday).getUTCFullYear();
  return { year, week: Math.floor((thursday - week1Start(year)) / (7 * DAY)) + 1 };
}

export function formatWeekKey({ year, week }: IsoWeek): string {
  return `${year}-w${String(week).padStart(2, "0")}`;
}

export function isoWeekKey(date: Date): string {
  return formatWeekKey(isoWeekOf(date));
}

/** "2026-w47" → { year, week }, or null when it isn't a real ISO week. */
export function parseWeekKey(key: string): IsoWeek | null {
  const match = WEEK_KEY.exec(key.trim().toLowerCase());
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (year < 2000 || year > 2999 || week < 1 || week > weeksInYear(year)) return null;
  return { year, week };
}

/** [start, end) of the week in UTC. */
export function weekRange({ year, week }: IsoWeek): { start: Date; end: Date } {
  const start = week1Start(year) + (week - 1) * 7 * DAY;
  return { start: new Date(start), end: new Date(start + 7 * DAY) };
}

/** The week before the one `now` falls in (what the Monday cron freezes). */
export function previousWeekKey(now: Date = new Date()): string {
  return isoWeekKey(new Date(now.getTime() - 7 * DAY));
}

/** True while the week hasn't ended yet, so its top 10 can't exist. */
export function isWeekOpen(week: IsoWeek, now: Date = new Date()): boolean {
  return weekRange(week).end.getTime() > now.getTime();
}

/** "Week 47, 2026" */
export function weekLabel({ year, week }: IsoWeek): string {
  return `Week ${week}, ${year}`;
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "16–22 Nov 2026" (or "28 Dec – 3 Jan 2027" across months). */
export function weekDates(week: IsoWeek): string {
  const { start, end } = weekRange(week);
  const last = new Date(end.getTime() - DAY);
  const sameMonth = start.getUTCMonth() === last.getUTCMonth();
  const from = sameMonth ? String(start.getUTCDate()) : dayMonth.format(start);
  return `${from}–${dayMonth.format(last)} ${last.getUTCFullYear()}`;
}
