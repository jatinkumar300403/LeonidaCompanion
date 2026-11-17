import "server-only";
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
 * Everything the home page shows (SPEC §3). Phase 1 returns [SAMPLE] data in development and
 * real empty states everywhere else. Phases 3–5 replace the body with Supabase queries.
 */
export async function getHomeData({ sample = sampleDataEnabled }: { sample?: boolean } = {}): Promise<HomeData> {
  return sample ? getSampleHomeData() : EMPTY_HOME_DATA;
}
