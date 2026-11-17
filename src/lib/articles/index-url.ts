import type { Route } from "next";
import { TAGS } from "@/config/tags";
import { parseSort, type ArticleSort } from "@/lib/articles/cursor";

/**
 * Section index state in the URL (SPEC §4): ?tag=, ?spoilers=1 (spoiler-free is the default),
 * ?sort=helpful (latest is the default) and ?cursor=. Real links, so every filter and the
 * "Load more" fallback work without JavaScript and can be crawled.
 */
export type IndexState = { tag: string | null; spoilerFree: boolean; sort: ArticleSort; cursor: string | null };

const tagSlugs = new Set<string>(TAGS.map((tag) => tag.slug));

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseIndexState(params: Params): IndexState {
  const tag = one(params.tag);
  const cursor = one(params.cursor);
  return {
    tag: tag && tagSlugs.has(tag) ? tag : null,
    spoilerFree: one(params.spoilers) !== "1",
    sort: parseSort(one(params.sort)),
    cursor: cursor && cursor.length <= 200 ? cursor : null,
  };
}

/** The URL for `state` on `base`, leaving defaults out so canonical URLs stay short. */
export function indexHref(base: string, state: Partial<IndexState>): Route {
  const params = new URLSearchParams();
  if (state.tag) params.set("tag", state.tag);
  if (state.spoilerFree === false) params.set("spoilers", "1");
  if (state.sort && state.sort !== "latest") params.set("sort", state.sort);
  if (state.cursor) params.set("cursor", state.cursor);
  const query = params.toString();
  return (query ? `${base}?${query}` : base) as Route;
}
