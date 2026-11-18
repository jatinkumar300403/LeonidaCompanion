/**
 * View models the UI renders. Server getters in src/server/* return these; later phases map
 * database rows (src/types/database.ts, generated in Phase 2) onto them.
 */
import type { ClipCategory, FactStatus, SpoilerLevel } from "@/config/tags";

export type { ClipCategory, FactStatus, SpoilerLevel };

export type TipSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  helpfulCount: number;
  spoilerLevel: SpoilerLevel;
  publishedAt: string;
};

/** Icon names a FeatureCard can show (kept as strings so data stays serialisable). */
export type FeatureIcon =
  "car" | "crosshair" | "wallet" | "map" | "siren" | "smartphone" | "users" | "camera" | "compass";

export type FeatureSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: FeatureIcon;
};

export type FactSummary = {
  id: string;
  slug: string;
  statement: string;
  status: FactStatus;
  sourceUrl: string | null;
};

export type ForumCategorySummary = {
  slug: string;
  name: string;
};

export type ThreadSummary = {
  id: number;
  slug: string;
  title: string;
  category: ForumCategorySummary;
  authorName: string;
  score: number;
  replyCount: number;
  isSolved: boolean;
  isSpoiler: boolean;
  isLocked: boolean;
  lastActivityAt: string;
  /** Plain-text start of the question (blurred in lists when isSpoiler). */
  excerpt?: string;
};

export type ClipPlatform = "twitch" | "youtube" | "tiktok";

export type ClipSummary = {
  id: number;
  platform: ClipPlatform;
  /** Twitch clip slug, YouTube video id or TikTok video id. */
  embedId: string;
  /** Canonical URL on the platform ("Watch on …"). */
  url: string;
  title: string;
  creatorName: string;
  creatorUrl: string;
  durationSec: number | null;
  thumbnailUrl: string | null;
  category: ClipCategory;
  score: number;
  orientation: "landscape" | "portrait";
};

export type AnswerSource = {
  n: number;
  title: string;
  url: string;
  sourceName: string;
  license?: string;
  attribution?: string;
};

export type HomeData = {
  tips: TipSummary[];
  threads: ThreadSummary[];
  clipOfTheDay: ClipSummary | null;
  features: FeatureSummary[];
  facts: FactSummary[];
};
