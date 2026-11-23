/**
 * Service-worker caching rules (SPEC §13, D-095), kept pure so they're unit-tested and shared by
 * src/app/sw.ts. No imports: the worker is bundled on its own by esbuild.
 *
 * - static:  hashed build assets, icons, favicons            → cache first
 * - image:   next/image responses                            → stale-while-revalidate
 * - article: guide pages (tips, features, facts, launch, online) → stale-while-revalidate (read offline)
 * - page:    other public pages                              → network first, cache as backup
 * - private: account, admin, auth, API and form pages        → network only (offline page on failure)
 * - none:    everything else (cross-origin, non-GET, RSC fetches, files) → not handled
 */
export type CacheRule = "static" | "image" | "article" | "page" | "private" | "none";

export type RequestFacts = {
  url: URL;
  sameOrigin: boolean;
  method: string;
  /** `Request.destination`: "document" for navigations, "" for fetch() and CACHE_URLS requests. */
  destination: string;
  /** Next.js App Router payload requests (`RSC: 1` header or `_rsc` param). */
  isRsc: boolean;
};

/** Never cached: per-user, staff-only, auth and form pages, APIs and the worker itself. */
export const PRIVATE_PREFIXES = [
  "/admin",
  "/settings",
  "/onboarding",
  "/sign-in",
  "/auth",
  "/api",
  "/serwist",
  "/forum/new",
  "/clips/submit",
  "/u/",
  "/newsletter/confirm",
  "/search",
] as const;

const STATIC_FILES = new Set(["/favicon.ico", "/icon.svg", "/apple-icon.png"]);
const ARTICLE_PATH = /^\/(?:tips|features|facts|online)\/[^/]+\/?$/;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isArticlePath(pathname: string): boolean {
  return pathname === "/launch" || ARTICLE_PATH.test(pathname);
}

/** A page request: a navigation, or a plain same-origin fetch of an extension-less path (CACHE_URLS). */
function isPageRequest({ url, destination, isRsc }: RequestFacts): boolean {
  if (isRsc) return false;
  if (destination === "document") return true;
  return destination === "" && !/\.[a-z0-9]+$/i.test(url.pathname);
}

export function classifyRequest(facts: RequestFacts): CacheRule {
  const { url, sameOrigin, method } = facts;
  if (method !== "GET" || !sameOrigin) return "none";
  const path = url.pathname;
  if (path.startsWith("/_next/static/") || path.startsWith("/icons/") || STATIC_FILES.has(path)) return "static";
  if (path === "/_next/image") return "image";
  if (!isPageRequest(facts)) return "none";
  if (isPrivatePath(path)) return "private";
  return isArticlePath(path) ? "article" : "page";
}

export function isRscRequest(request: Pick<Request, "headers">, url: URL): boolean {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

export const OFFLINE_PATH = "/offline";

/** Cache names; the offline page lists what's saved in these two. */
export const CACHE_NAMES = {
  static: "la-static",
  images: "la-images",
  articles: "la-articles",
  pages: "la-pages",
} as const;
