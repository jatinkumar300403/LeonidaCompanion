/**
 * Taxonomies and their display labels, kept in one place for later i18n.
 * Article/thread tags are the SPEC §4 seed list; Phase 2 seeds the same slugs into the database.
 */

export const TAGS = [
  { slug: "beginner", label: "Beginner" },
  { slug: "money", label: "Money" },
  { slug: "combat", label: "Combat" },
  { slug: "driving", label: "Driving" },
  { slug: "stealth", label: "Stealth" },
  { slug: "missions", label: "Missions" },
  { slug: "heists", label: "Heists" },
  { slug: "wanted-level", label: "Wanted level" },
  { slug: "vehicles", label: "Vehicles" },
  { slug: "weapons", label: "Weapons" },
  { slug: "characters", label: "Characters" },
  { slug: "map", label: "Map" },
  { slug: "activities", label: "Activities" },
  { slug: "social-media", label: "Social media" },
  { slug: "settings", label: "Settings" },
  { slug: "performance", label: "Performance" },
  { slug: "accessibility", label: "Accessibility" },
  { slug: "online", label: "Online" },
  { slug: "collectibles", label: "Collectibles" },
  { slug: "easter-eggs", label: "Easter eggs" },
] as const;

export type TagSlug = (typeof TAGS)[number]["slug"];

const tagLabels = new Map<string, string>(TAGS.map((tag) => [tag.slug, tag.label]));

/** Label for a tag slug; unknown slugs fall back to a readable version of the slug. */
export function tagLabel(slug: string): string {
  return tagLabels.get(slug) ?? slug.replace(/-/g, " ");
}

/** Clip categories. The stored value is `glitch`; "Glitch (funny)" is only the label (D-015). */
export const CLIP_CATEGORIES = [
  { value: "funny", label: "Funny" },
  { value: "epic", label: "Epic" },
  { value: "fail", label: "Fail" },
  { value: "stunt", label: "Stunt" },
  { value: "glitch", label: "Glitch (funny)" },
  { value: "other", label: "Other" },
] as const;

export type ClipCategory = (typeof CLIP_CATEGORIES)[number]["value"];

export function clipCategoryLabel(value: ClipCategory): string {
  return CLIP_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

/** Fact status badges (CLAUDE.md rule 7). Rumours are never facts. */
export const FACT_STATUSES = {
  confirmed: { label: "Confirmed", description: "Backed by an official Rockstar source" },
  verified: { label: "Verified", description: "Checked by staff against 2+ reliable sources" },
  community: { label: "Community", description: "Found by players in a solved forum thread" },
} as const;

export type FactStatus = keyof typeof FACT_STATUSES;

export const SPOILER_LEVELS = {
  none: "No spoilers",
  minor: "Minor spoilers",
  major: "Story spoilers",
} as const;

export type SpoilerLevel = keyof typeof SPOILER_LEVELS;
