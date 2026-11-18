/**
 * Forum settings and labels (SPEC §5), kept in one place for later i18n. Categories themselves
 * live in the database (supabase/seed.sql).
 */

/** Threads per list page. Lists use offset pages (`?page=`), like hot_threads (D-064). */
export const FORUM_PAGE_SIZE = 20;

/** Most replies shown on one thread page. */
export const THREAD_POSTS_MAX = 500;

/** SPEC §5 report reasons, mapped to the values the reports table accepts. */
export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate", label: "Hate" },
  { value: "sexual", label: "Sexual content" },
  { value: "spoiler", label: "Spoiler without a tag" },
  { value: "cheating", label: "Cheating or exploit" },
  { value: "leak", label: "Leak" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_TARGETS = ["thread", "post", "profile"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/** Shown on AI suggested answers (SPEC §5; Phase 8 creates them). */
export const AI_POST_LABEL = "AI suggestion · may be wrong";

/** Name shown for content whose author deleted their account. */
export const DELETED_USER = "[deleted user]";
