import { describe, expect, it } from "vitest";
import {
  SAMPLE_CLIPS,
  SAMPLE_FACTS,
  SAMPLE_FEATURES,
  SAMPLE_THREADS,
  SAMPLE_TIPS,
  sampleDataEnabled,
} from "@/server/mock/data";
import { EMPTY_HOME_DATA, getHomeData } from "./get-home-data";

describe("getHomeData", () => {
  it("never serves sample data outside development", async () => {
    expect(sampleDataEnabled).toBe(false); // NODE_ENV is "test" here
    expect(await getHomeData()).toEqual(EMPTY_HOME_DATA);
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
