import type { Route } from "next";

/** Builders for dynamic URLs, typed as Route so links stay checked under typedRoutes. */
const seg = encodeURIComponent;

function withQuery(path: string, query: Record<string, string | undefined>): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return (search ? `${path}?${search}` : path) as Route;
}

export const routes = {
  tip: (slug: string) => `/tips/${seg(slug)}` as Route,
  feature: (slug: string) => `/features/${seg(slug)}` as Route,
  fact: (slug: string) => `/facts/${seg(slug)}` as Route,
  forumCategory: (slug: string) => `/forum/${seg(slug)}` as Route,
  thread: (id: number, slug: string) => `/forum/t/${id}/${seg(slug)}` as Route,
  newThread: (title?: string) => withQuery("/forum/new", { title }),
  clip: (id: number) => `/clips/${id}` as Route,
  user: (username: string) => `/u/${seg(username)}` as Route,
  ask: (question?: string) => withQuery("/ask", { q: question }),
  search: (query?: string) => withQuery("/search", { q: query }),
  tipsTagged: (tag: string) => withQuery("/tips", { tag }),
  unanswered: () => withQuery("/forum", { sort: "unanswered" }),
};
