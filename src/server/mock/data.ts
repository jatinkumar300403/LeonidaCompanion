import "server-only";
import type { ClipSummary, FactSummary, FeatureSummary, HomeData, ThreadSummary, TipSummary } from "@/types/content";

/**
 * Dev-only placeholder content (D-030). Every title is marked "[SAMPLE]" and nothing here is a
 * claim about the game: real tips and facts come from the CMS with sources (Phase 3/13).
 * Production builds never use this (see sampleDataEnabled).
 */
export const sampleDataEnabled = process.env.NODE_ENV === "development";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const SAMPLE_TIPS: TipSummary[] = [
  {
    id: "s-tip-1",
    slug: "sample-lose-a-wanted-level",
    title: "[SAMPLE] How to lose a wanted level fast",
    summary: "Sample summary: break line of sight first, then wait it out somewhere quiet.",
    tags: ["wanted-level", "beginner"],
    helpfulCount: 1284,
    spoilerLevel: "none",
    publishedAt: hoursAgo(3),
  },
  {
    id: "s-tip-2",
    slug: "sample-settings-to-change-first",
    title: "[SAMPLE] Settings to change before you start playing",
    summary: "Sample summary: subtitles, camera speed and HUD options worth a look on day one.",
    tags: ["settings", "accessibility"],
    helpfulCount: 512,
    spoilerLevel: "none",
    publishedAt: hoursAgo(5),
  },
  {
    id: "s-tip-3",
    slug: "sample-save-often",
    title: "[SAMPLE] Save often: a small habit that pays off later",
    summary: "Sample summary: a one-line answer that fits on a phone screen.",
    tags: ["beginner"],
    helpfulCount: 97,
    spoilerLevel: "none",
    publishedAt: hoursAgo(9),
  },
  {
    id: "s-tip-4",
    slug: "sample-early-money",
    title: "[SAMPLE] Sensible ways to build up money early on",
    summary: "Sample summary: a tip with a longer title to check how two lines wrap in the card.",
    tags: ["money", "activities", "beginner"],
    helpfulCount: 2310,
    spoilerLevel: "none",
    publishedAt: hoursAgo(20),
  },
  {
    id: "s-tip-5",
    slug: "sample-city-driving",
    title: "[SAMPLE] Driving tips for tight city streets",
    summary: "Sample summary: brake earlier than you think, and use the handbrake sparingly.",
    tags: ["driving", "vehicles"],
    helpfulCount: 46,
    spoilerLevel: "minor",
    publishedAt: hoursAgo(26),
  },
  {
    id: "s-tip-6",
    slug: "sample-accessibility-options",
    title: "[SAMPLE] Accessibility options worth turning on",
    summary: "Sample summary: options that make long sessions easier on the eyes and hands.",
    tags: ["accessibility", "settings"],
    helpfulCount: 18,
    spoilerLevel: "none",
    publishedAt: hoursAgo(30),
  },
];

const category = {
  help: { slug: "help", name: "Help & Questions" },
  story: { slug: "missions-story", name: "Missions & Story" },
  bugs: { slug: "bugs-performance", name: "Bugs, Performance & Settings" },
  general: { slug: "general", name: "General Discussion" },
  feedback: { slug: "site-feedback", name: "Site Feedback" },
};

export const SAMPLE_THREADS: ThreadSummary[] = [
  {
    id: 101,
    slug: "sample-where-is-the-save-option",
    title: "[SAMPLE] Can't find the save option after the first mission?",
    category: category.help,
    authorName: "sample_player",
    score: 24,
    replyCount: 6,
    isSolved: true,
    isSpoiler: false,
    isLocked: false,
    lastActivityAt: hoursAgo(0.3),
  },
  {
    id: 102,
    slug: "sample-graphics-mode",
    title: "[SAMPLE] Which graphics mode are you using, and why?",
    category: category.bugs,
    authorName: "sample_tester",
    score: 41,
    replyCount: 18,
    isSolved: false,
    isSpoiler: false,
    isLocked: false,
    lastActivityAt: hoursAgo(1.5),
  },
  {
    id: 103,
    slug: "sample-getaway-stories",
    title: "[SAMPLE] Post your best getaway stories",
    category: category.general,
    authorName: "sample_driver",
    score: 87,
    replyCount: 132,
    isSolved: false,
    isSpoiler: false,
    isLocked: false,
    lastActivityAt: hoursAgo(2),
  },
  {
    id: 104,
    slug: "sample-story-discussion",
    title: "[SAMPLE] Story discussion thread (spoilers inside)",
    category: category.story,
    authorName: "sample_reader",
    score: 15,
    replyCount: 9,
    isSolved: false,
    isSpoiler: true,
    isLocked: false,
    lastActivityAt: hoursAgo(4),
  },
  {
    id: 105,
    slug: "sample-site-feedback",
    title: "[SAMPLE] Site feedback: what should we add next?",
    category: category.feedback,
    authorName: "sample_admin",
    score: 12,
    replyCount: 4,
    isSolved: false,
    isSpoiler: false,
    isLocked: true,
    lastActivityAt: hoursAgo(28),
  },
];

export const SAMPLE_CLIPS: ClipSummary[] = [
  {
    id: 9001,
    platform: "twitch",
    embedId: "SampleClipSlug-NotARealClip",
    url: "https://www.twitch.tv/",
    title: "[SAMPLE] Clean getaway through rush-hour traffic",
    creatorName: "SampleStreamer",
    creatorUrl: "https://www.twitch.tv/",
    durationSec: 24,
    thumbnailUrl: null,
    category: "epic",
    score: 312,
    orientation: "landscape",
  },
  {
    id: 9002,
    platform: "youtube",
    embedId: "sample-video-id",
    url: "https://www.youtube.com/",
    title: "[SAMPLE] The most unlucky parking job",
    creatorName: "SampleCreator",
    creatorUrl: "https://www.youtube.com/",
    durationSec: 41,
    thumbnailUrl: null,
    category: "fail",
    score: 98,
    orientation: "landscape",
  },
  {
    id: 9003,
    platform: "tiktok",
    embedId: "0000000000000000000",
    url: "https://www.tiktok.com/",
    title: "[SAMPLE] Physics doing physics things",
    creatorName: "sample.clips",
    creatorUrl: "https://www.tiktok.com/",
    durationSec: 18,
    thumbnailUrl: null,
    category: "glitch",
    score: 57,
    orientation: "portrait",
  },
];

export const SAMPLE_FEATURES: FeatureSummary[] = [
  {
    id: "s-feat-1",
    slug: "sample-wanted-system",
    title: "[SAMPLE] How the wanted system works",
    summary: "Sample summary: what raises it, what lowers it, and what we haven't confirmed yet.",
    icon: "siren",
  },
  {
    id: "s-feat-2",
    slug: "sample-character-switching",
    title: "[SAMPLE] Switching characters, explained",
    summary: "Sample summary: when you can switch and what carries over between characters.",
    icon: "users",
  },
  {
    id: "s-feat-3",
    slug: "sample-vehicles",
    title: "[SAMPLE] Vehicles and customisation",
    summary: "Sample summary: owning, storing and upgrading vehicles.",
    icon: "car",
  },
  {
    id: "s-feat-4",
    slug: "sample-phone",
    title: "[SAMPLE] The in-game phone and its apps",
    summary: "Sample summary: the apps you'll actually use, and how to get to them fast.",
    icon: "smartphone",
  },
  {
    id: "s-feat-5",
    slug: "sample-money",
    title: "[SAMPLE] Money, jobs and spending",
    summary: "Sample summary: how earning and spending fit together.",
    icon: "wallet",
  },
  {
    id: "s-feat-6",
    slug: "sample-map",
    title: "[SAMPLE] Getting around the map",
    summary: "Sample summary: fast travel, waypoints and map filters.",
    icon: "map",
  },
];

export const SAMPLE_FACTS: FactSummary[] = [
  {
    id: "s-fact-1",
    slug: "sample-confirmed-fact",
    statement: "[SAMPLE] A one-sentence confirmed fact, linked to its official source.",
    status: "confirmed",
    sourceUrl: "https://example.com/official-source",
  },
  {
    id: "s-fact-2",
    slug: "sample-verified-fact",
    statement: "[SAMPLE] A verified fact, checked by staff against two or more independent sources.",
    status: "verified",
    sourceUrl: "https://example.org/report",
  },
  {
    id: "s-fact-3",
    slug: "sample-community-fact",
    statement: "[SAMPLE] A community fact that came out of a solved forum thread.",
    status: "community",
    sourceUrl: null,
  },
  {
    id: "s-fact-4",
    slug: "sample-easter-egg",
    statement: "[SAMPLE] An easter egg, written as one plain sentence with its source below.",
    status: "verified",
    sourceUrl: "https://example.net/clip",
  },
  {
    id: "s-fact-5",
    slug: "sample-long-fact",
    statement:
      "[SAMPLE] A longer fact sentence to check how the card clamps text that runs past four lines on a narrow phone screen without breaking the layout.",
    status: "confirmed",
    sourceUrl: "https://example.com/another-source",
  },
];

export function getSampleHomeData(): HomeData {
  return {
    tips: SAMPLE_TIPS,
    threads: SAMPLE_THREADS,
    clipOfTheDay: SAMPLE_CLIPS[0],
    features: SAMPLE_FEATURES,
    facts: SAMPLE_FACTS,
  };
}
