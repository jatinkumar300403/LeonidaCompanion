import "server-only";
import { unstable_cache } from "next/cache";
import type { Route } from "next";
import { articlePath, ARTICLE_TYPE_INFO, type ArticleType } from "@/config/articles";
import { siteConfig } from "@/config/site";
import { isThinThread } from "@/lib/forum/rules";
import { routes } from "@/lib/routes";
import type { RssItem } from "@/lib/seo/rss";
import { absoluteUrl, SITEMAP_MAX_URLS, type SitemapEntry, type SitemapSection } from "@/lib/seo/sitemap";
import { ARTICLES_TAG, SITE_SETTINGS_TAG } from "@/server/articles/cache-tags";
import { CLIPS_TAG, CLIPS_WEEKLY_TAG } from "@/server/clips/cache-tags";
import { getFlags } from "@/server/flags";
import { FORUM_TAG } from "@/server/forum/cache-tags";
import { getCategories } from "@/server/forum/queries";
import { getPublicSupabase } from "@/server/supabase/public";

/**
 * Sitemap and RSS data (SPEC §13, D-096). Everything is read as `anon` through the cookie-less
 * client, so RLS decides what's public, and cached under the same tags the publish pipeline and
 * the forum and clip actions already invalidate. Errors log and return what was read so far.
 */

/** Public pages that aren't data-driven. Search, account and form pages are left out (noindex). */
export const STATIC_SITEMAP_PATHS: readonly Route[] = [
  "/",
  "/launch",
  "/tips",
  "/features",
  "/facts",
  "/forum",
  "/clips",
  "/online",
  "/ask",
  "/about",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/community-guidelines",
  "/dmca",
  "/credits",
  "/contact",
];

/** PostgREST's default row cap per request. */
const PAGE = 1000;
const url = (path: string) => absoluteUrl(siteConfig.url, path);

async function pageThrough<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < SITEMAP_MAX_URLS; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) {
      console.error(`[seo] ${label} failed:`, error.message);
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function articleEntries(types: ArticleType[]): Promise<SitemapEntry[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const rows = await pageThrough("articles sitemap", (from, to) =>
    supabase
      .from("articles")
      .select("type, slug, updated_at")
      .eq("status", "published")
      .in("type", types)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  return rows.flatMap((row) => {
    const path = articlePath(row.type as ArticleType, row.slug);
    return path ? [{ url: url(path), lastModified: row.updated_at }] : [];
  });
}

async function pageEntries(): Promise<SitemapEntry[]> {
  const [flags, categories] = await Promise.all([getFlags(), getCategories()]);
  const entries: SitemapEntry[] = STATIC_SITEMAP_PATHS.map((path) => ({ url: url(path) }));
  if (siteConfig.showImpressum) entries.push({ url: url("/impressum") });
  for (const category of categories) entries.push({ url: url(routes.forumCategory(category.slug)) });
  // Online guides exist only while FEATURE_ONLINE is on (D-019).
  if (flags.FEATURE_ONLINE) entries.push(...(await articleEntries(["online"])));
  return entries;
}

async function forumEntries(): Promise<SitemapEntry[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const rows = await pageThrough("forum sitemap", (from, to) =>
    supabase
      .from("threads")
      .select("id, slug, excerpt, reply_count, last_activity_at")
      .in("status", ["open", "solved", "locked"])
      .order("last_activity_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  // Same rules as the thread page's noindex (D-017, D-067): no thin threads and no deleted
  // questions. `excerpt` is the first 280 characters of the body, so it stands in for the length.
  return rows
    .filter((row) => {
      const body = row.excerpt ?? "";
      return body !== "[deleted]" && !isThinThread({ replyCount: row.reply_count, bodyMd: body });
    })
    .map((row) => ({ url: url(routes.thread(row.id, row.slug)), lastModified: row.last_activity_at }));
}

async function clipEntries(): Promise<SitemapEntry[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const [clips, weeks] = await Promise.all([
    pageThrough("clips sitemap", (from, to) =>
      supabase
        .from("clips")
        .select("id, approved_at")
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
    pageThrough("weekly clips sitemap", (from, to) =>
      supabase.from("clip_weekly").select("week, created_at").order("week", { ascending: false }).range(from, to),
    ),
  ]);
  return [
    ...clips.map((row) => ({ url: url(routes.clip(row.id)), lastModified: row.approved_at })),
    ...weeks.map((row) => ({ url: url(routes.clipsWeek(row.week)), lastModified: row.created_at })),
  ];
}

const SECTION_TAGS: Record<SitemapSection, string[]> = {
  pages: [ARTICLES_TAG, FORUM_TAG, SITE_SETTINGS_TAG],
  tips: [ARTICLES_TAG],
  features: [ARTICLES_TAG],
  facts: [ARTICLES_TAG],
  forum: [FORUM_TAG],
  clips: [CLIPS_TAG, CLIPS_WEEKLY_TAG],
};

async function fetchSection(section: SitemapSection): Promise<SitemapEntry[]> {
  switch (section) {
    case "pages":
      return pageEntries();
    case "tips":
      return articleEntries(["tip"]);
    case "features":
      return articleEntries(["feature"]);
    case "facts":
      return articleEntries(["fact"]);
    case "forum":
      return forumEntries();
    case "clips":
      return clipEntries();
  }
}

export function getSitemapEntries(section: SitemapSection): Promise<SitemapEntry[]> {
  return unstable_cache(fetchSection, ["seo:sitemap"], { tags: SECTION_TAGS[section], revalidate: 3600 })(section);
}

const RSS_TYPES = ["tip", "feature", "fact"] as const satisfies readonly ArticleType[];
const RSS_LIMIT = 50;

/** The newest spoiler-free guides (rule 5: spoilers stay hidden by default, feeds included). */
async function fetchRssItems(): Promise<RssItem[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("type, slug, title, summary, published_at")
    .eq("status", "published")
    .eq("spoiler_level", "none")
    .in("type", [...RSS_TYPES])
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(RSS_LIMIT);
  if (error) {
    console.error("[seo] rss failed:", error.message);
    return [];
  }
  return data.flatMap((row) => {
    const type = row.type as ArticleType;
    const path = articlePath(type, row.slug);
    if (!path || !row.published_at) return [];
    return [
      {
        title: row.title,
        url: url(path),
        description: row.summary ?? "",
        publishedAt: row.published_at,
        category: ARTICLE_TYPE_INFO[type].section,
      },
    ];
  });
}

export const getRssItems = unstable_cache(fetchRssItems, ["seo:rss"], { tags: [ARTICLES_TAG], revalidate: 600 });
