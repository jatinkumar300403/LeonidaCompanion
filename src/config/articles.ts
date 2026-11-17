import type { Route } from "next";

/** Article types, statuses and their labels (SPEC §4, §11). Strings live here for later i18n. */
export const ARTICLE_TYPES = ["tip", "feature", "fact", "online", "launch", "guide"] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const ARTICLE_STATUSES = ["draft", "review", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const SPOILER_LEVEL_VALUES = ["none", "minor", "major"] as const;
export const FACT_STATUS_VALUES = ["confirmed", "verified", "community"] as const;

type TypeInfo = {
  /** Singular label ("Tip"). */
  label: string;
  /** Section name used in titles: "{Title} – GTA 6 {section}" (SPEC §13). */
  section: string;
  /** Public index route, or null when the type has no public pages (D-019). */
  index: Route | null;
};

export const ARTICLE_TYPE_INFO: Record<ArticleType, TypeInfo> = {
  tip: { label: "Tip", section: "Tips", index: "/tips" },
  feature: { label: "Feature", section: "Features", index: "/features" },
  fact: { label: "Fact", section: "Facts", index: "/facts" },
  online: { label: "Online guide", section: "Online", index: "/online" },
  launch: { label: "Launch article", section: "Launch", index: "/launch" },
  guide: { label: "Guide", section: "Guides", index: null },
};

/** Public URL of an article, or null when the type has no public page (launch lives at /launch). */
export function articlePath(type: ArticleType, slug: string): Route | null {
  const s = encodeURIComponent(slug);
  switch (type) {
    case "tip":
      return `/tips/${s}` as Route;
    case "feature":
      return `/features/${s}` as Route;
    case "fact":
      return `/facts/${s}` as Route;
    case "online":
      return `/online/${s}` as Route;
    case "launch":
      return "/launch";
    case "guide":
      return null;
  }
}

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
};

/** Quick Tip limits (SPEC §10: title + 2–5 sentences). The sentence range is a hint, the length a rule. */
export const QUICK_TIP = { bodyMin: 20, bodyMax: 700, sentencesMin: 2, sentencesMax: 5 } as const;
export const TITLE_MAX = 160;
export const SUMMARY_MAX = 160;
export const BODY_MAX = 60_000;
export const SOURCES_MAX = 20;
export const TAGS_MAX = 6;
/** Index pages: items per page. */
export const PAGE_SIZE = 12;
