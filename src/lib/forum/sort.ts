import type { Route } from "next";

/**
 * Forum list state from the URL (SPEC §5 sorting): Hot (default), New, Top (day / week / all,
 * default week) and Unanswered, with 1-based offset pages. Defaults are left out of URLs.
 */
export const FORUM_SORTS = ["hot", "new", "top", "unanswered"] as const;
export type ForumSort = (typeof FORUM_SORTS)[number];

export const TOP_WINDOWS = ["day", "week", "all"] as const;
export type TopWindow = (typeof TOP_WINDOWS)[number];

export const SORT_LABELS: Record<ForumSort, string> = {
  hot: "Hot",
  new: "New",
  top: "Top",
  unanswered: "Unanswered",
};

export const WINDOW_LABELS: Record<TopWindow, string> = { day: "Today", week: "This week", all: "All time" };

export type ForumListState = { sort: ForumSort; t: TopWindow; page: number };

export const DEFAULT_LIST_STATE: ForumListState = { sort: "hot", t: "week", page: 1 };

/** Highest page we serve; beyond it the offset gets silly for a forum list. */
export const MAX_PAGE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseForumListState(params: SearchParams): ForumListState {
  const sort = first(params.sort);
  const t = first(params.t);
  const page = Number.parseInt(first(params.page) ?? "", 10);
  return {
    sort: FORUM_SORTS.includes(sort as ForumSort) ? (sort as ForumSort) : "hot",
    t: TOP_WINDOWS.includes(t as TopWindow) ? (t as TopWindow) : "week",
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** True when the URL asked for a list sort (on /forum this switches from the landing to a list). */
export function hasSortParam(params: SearchParams): boolean {
  return FORUM_SORTS.includes(first(params.sort) as ForumSort);
}

/**
 * Link to a list state. `keepSort` always writes `sort` (the /forum landing needs it to show a
 * list); otherwise default values are omitted so canonical URLs stay short.
 */
export function forumListHref(basePath: string, state: Partial<ForumListState>, keepSort = false): Route {
  const full = { ...DEFAULT_LIST_STATE, ...state };
  const params = new URLSearchParams();
  if (keepSort || full.sort !== "hot") params.set("sort", full.sort);
  if (full.sort === "top" && full.t !== "week") params.set("t", full.t);
  if (full.page > 1) params.set("page", String(full.page));
  const search = params.toString();
  return (search ? `${basePath}?${search}` : basePath) as Route;
}

const WINDOW_MS: Record<Exclude<TopWindow, "all">, number> = { day: 86_400_000, week: 7 * 86_400_000 };

/** Start of the Top window (ISO), or null for all time. */
export function topWindowStart(t: TopWindow, now: number = Date.now()): string | null {
  return t === "all" ? null : new Date(now - WINDOW_MS[t]).toISOString();
}

/** D-017: a Q&A thread counts as unanswered once it is 24 hours old without an accepted answer. */
export function unansweredCutoff(now: number = Date.now()): string {
  return new Date(now - 86_400_000).toISOString();
}

export function pageOffset(page: number, pageSize: number): number {
  return (Math.max(page, 1) - 1) * pageSize;
}
