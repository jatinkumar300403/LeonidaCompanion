import { describe, expect, it, vi } from "vitest";
import type { ArticleListItem } from "@/server/articles/model";
import {
  SAMPLE_CLIPS,
  SAMPLE_FACTS,
  SAMPLE_FEATURES,
  SAMPLE_THREADS,
  SAMPLE_TIPS,
  sampleDataEnabled,
} from "@/server/mock/data";
import { EMPTY_HOME_DATA, getHomeData } from "./get-home-data";

const latest = vi.hoisted(() => ({ tips: [] as ArticleListItem[] }));
vi.mock("@/server/articles/queries", () => ({
  getLatestArticles: async (type: string) => (type === "tip" ? latest.tips : []),
}));
vi.mock("@/server/forum/queries", () => ({ getHotThreads: async () => [] }));

describe("getHomeData", () => {
  it("never serves sample data outside development", async () => {
    expect(sampleDataEnabled).toBe(false); // NODE_ENV is "test" here
    expect(await getHomeData()).toEqual(EMPTY_HOME_DATA);
  });

  it("maps real articles, and keeps them over samples in development", async () => {
    latest.tips = [
      {
        id: "a",
        type: "tip",
        slug: "real-tip",
        title: "A real tip",
        summary: "Summary",
        tags: ["money"],
        spoilerLevel: "none",
        factStatus: null,
        firstSourceUrl: null,
        helpfulUp: 7,
        publishedAt: "2026-11-19T00:00:00Z",
        updatedAt: "2026-11-19T00:00:00Z",
      },
    ];
    const data = await getHomeData({ sample: true });
    expect(data.tips).toEqual([expect.objectContaining({ slug: "real-tip", helpfulCount: 7 })]);
    expect(data.features).toEqual(SAMPLE_FEATURES);
    expect((await getHomeData()).tips).toHaveLength(1);
    latest.tips = [];
  });

  it("serves sample data when asked (development)", async () => {
    const data = await getHomeData({ sample: true });
    expect(data.tips).toHaveLength(6);
    expect(data.threads).toHaveLength(5);
    expect(data.features).toHaveLength(6);
    expect(data.clipOfTheDay).not.toBeNull();
  });
});

describe("sample data", () => {
  it("labels every item [SAMPLE] so it can't pass for real content", () => {
    const titles = [
      ...SAMPLE_TIPS.map((t) => t.title),
      ...SAMPLE_THREADS.map((t) => t.title),
      ...SAMPLE_CLIPS.map((c) => c.title),
      ...SAMPLE_FEATURES.map((f) => f.title),
      ...SAMPLE_FACTS.map((f) => f.statement),
    ];
    for (const title of titles) expect(title.startsWith("[SAMPLE] ")).toBe(true);
  });
});
