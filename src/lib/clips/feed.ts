import type { Route } from "next";
import { CLIP_CATEGORIES, type ClipCategory } from "@/config/tags";
import { CLIP_MAX_PAGE } from "@/config/clips";

/**
 * /clips list state from the URL (SPEC §1, §6): category filter, Hot (default) · New · Top this
 * week, 1-based offset pages. Defaults are left out of URLs so canonicals stay short.
 */
export const CLIP_SORTS = ["hot", "new", "top"] as const;
export type ClipSort = (typeof CLIP_SORTS)[number];

export const CLIP_SORT_LABELS: Record<ClipSort, string> = { hot: "Hot", new: "New", top: "Top this week" };

export type ClipListState = { category: ClipCategory | null; sort: ClipSort; page: number };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const categories = CLIP_CATEGORIES.map((category) => category.value) as readonly string[];

export function parseClipListState(params: SearchParams): ClipListState {
  const category = first(params.category);
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "", 10);
  return {
    category: category && categories.includes(category) ? (category as ClipCategory) : null,
    sort: CLIP_SORTS.includes(sort as ClipSort) ? (sort as ClipSort) : "hot",
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, CLIP_MAX_PAGE) : 1,
  };
}

export function clipsListHref(state: Partial<ClipListState>): Route {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.sort && state.sort !== "hot") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const search = params.toString();
  return (search ? `/clips?${search}` : "/clips") as Route;
}

/** Start of the "Top this week" window: the last 7 days. */
export function topWeekStart(now: number = Date.now()): string {
  return new Date(now - 7 * 86_400_000).toISOString();
}
