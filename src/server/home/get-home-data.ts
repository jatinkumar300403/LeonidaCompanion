import "server-only";
import { getLatestArticles } from "@/server/articles/queries";
import { toFactSummary, toFeatureSummary, toTipSummary } from "@/server/articles/model";
import { getClipOfTheDay } from "@/server/clips/queries";
import { getHotThreads } from "@/server/forum/queries";
import { getSampleHomeData, sampleDataEnabled } from "@/server/mock/data";
import type { HomeData } from "@/types/content";

export const EMPTY_HOME_DATA: HomeData = {
  tips: [],
  threads: [],
  clipOfTheDay: null,
  features: [],
  facts: [],
};

/**
 * Everything the home page shows (SPEC §3). Tips, features and facts are the newest published,
 * spoiler-free articles; threads are the forum's hot list; the clip of the day follows D-022. In development a
 * block with no real content shows the [SAMPLE] placeholders instead (D-030); production and
 * preview builds show real empty states.
 */
export async function getHomeData({ sample = sampleDataEnabled }: { sample?: boolean } = {}): Promise<HomeData> {
  const [tips, features, facts, threads, clipOfTheDay] = await Promise.all([
    getLatestArticles("tip", 6),
    getLatestArticles("feature", 6),
    getLatestArticles("fact", 8),
    getHotThreads(5),
    getClipOfTheDay(),
  ]);
  const real: HomeData = {
    ...EMPTY_HOME_DATA,
    tips: tips.map(toTipSummary),
    threads,
    clipOfTheDay,
    features: features.map(toFeatureSummary),
    facts: facts.map(toFactSummary),
  };
  if (!sample) return real;

  const samples = getSampleHomeData();
  return {
    tips: real.tips.length > 0 ? real.tips : samples.tips,
    threads: real.threads.length > 0 ? real.threads : samples.threads,
    clipOfTheDay: real.clipOfTheDay ?? samples.clipOfTheDay,
    features: real.features.length > 0 ? real.features : samples.features,
    facts: real.facts.length > 0 ? real.facts : samples.facts,
  };
}
