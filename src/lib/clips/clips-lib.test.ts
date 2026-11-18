import { describe, expect, it } from "vitest";
import { CLIP_MAX_SECONDS, isAllowedThumbnailHost } from "@/config/clips";
import { publicEmbedUrl, tiktokEmbedUrl } from "./embed";
import { clipErrorMessage } from "./errors";
import { parseIsoDuration, toIsoDuration } from "./duration";
import { clipsListHref, parseClipListState, topWeekStart } from "./feed";
import {
  formatWeekKey,
  isoWeekKey,
  isoWeekOf,
  isWeekOpen,
  parseWeekKey,
  previousWeekKey,
  weekDates,
  weekRange,
} from "./week";

describe("parseIsoDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT1M5S", 65],
    ["PT1M", 60],
    ["PT1H2M3S", 3723],
    ["PT12.6S", 13],
    ["P1DT1S", 86_401],
    ["P0D", 0],
  ])("%s → %d seconds", (input, seconds) => {
    expect(parseIsoDuration(input)).toBe(seconds);
  });

  it.each(["", "P", "PT", "45", "PT-5S", "1M", null, undefined])("returns null for %s", (input) => {
    expect(parseIsoDuration(input)).toBeNull();
  });

  it("formats seconds back for JSON-LD", () => {
    expect(toIsoDuration(24)).toBe("PT24S");
    expect(toIsoDuration(65)).toBe("PT1M5S");
    expect(toIsoDuration(CLIP_MAX_SECONDS)).toBe("PT1M");
  });
});

describe("ISO weeks", () => {
  it("names the launch week 2026-w47", () => {
    expect(isoWeekKey(new Date("2026-11-19T12:00:00Z"))).toBe("2026-w47");
    expect(isoWeekKey(new Date("2026-11-16T00:00:00Z"))).toBe("2026-w47");
    expect(isoWeekKey(new Date("2026-11-15T23:59:59Z"))).toBe("2026-w46");
  });

  it("handles year boundaries", () => {
    expect(isoWeekOf(new Date("2027-01-01T00:00:00Z"))).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOf(new Date("2024-12-30T00:00:00Z"))).toEqual({ year: 2025, week: 1 });
    expect(isoWeekKey(new Date("2021-01-03T10:00:00Z"))).toBe("2020-w53");
  });

  it("parses only real week keys", () => {
    expect(parseWeekKey("2026-w47")).toEqual({ year: 2026, week: 47 });
    expect(parseWeekKey("2026-W47")).toEqual({ year: 2026, week: 47 });
    expect(parseWeekKey("2026-w53")).toEqual({ year: 2026, week: 53 });
    expect(parseWeekKey("2025-w53")).toBeNull();
    expect(parseWeekKey("2026-w00")).toBeNull();
    expect(parseWeekKey("2026-47")).toBeNull();
    expect(parseWeekKey("1999-w10")).toBeNull();
    expect(formatWeekKey({ year: 2026, week: 7 })).toBe("2026-w07");
  });

  it("gives the Monday-to-Monday UTC range", () => {
    const { start, end } = weekRange({ year: 2026, week: 47 });
    expect(start.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(weekDates({ year: 2026, week: 47 })).toBe("16–22 Nov 2026");
    expect(weekDates({ year: 2026, week: 53 })).toBe("28 Dec–3 Jan 2027");
  });

  it("freezes the previous week on Monday morning", () => {
    expect(previousWeekKey(new Date("2026-11-23T06:00:00Z"))).toBe("2026-w47");
    expect(isWeekOpen({ year: 2026, week: 47 }, new Date("2026-11-22T23:00:00Z"))).toBe(true);
    expect(isWeekOpen({ year: 2026, week: 47 }, new Date("2026-11-23T00:00:00Z"))).toBe(false);
  });
});

describe("clip list state", () => {
  it("reads category, sort and page with safe defaults", () => {
    expect(parseClipListState({})).toEqual({ category: null, sort: "hot", page: 1 });
    expect(parseClipListState({ category: "glitch", sort: "top", page: "3" })).toEqual({
      category: "glitch",
      sort: "top",
      page: 3,
    });
    expect(parseClipListState({ category: "glitch-funny", sort: "best", page: "-2" })).toEqual({
      category: null,
      sort: "hot",
      page: 1,
    });
    expect(parseClipListState({ page: "9999" }).page).toBe(50);
  });

  it("builds short URLs without defaults", () => {
    expect(clipsListHref({})).toBe("/clips");
    expect(clipsListHref({ sort: "hot", page: 1 })).toBe("/clips");
    expect(clipsListHref({ category: "fail", sort: "new", page: 2 })).toBe("/clips?category=fail&sort=new&page=2");
  });

  it("starts Top this week seven days back", () => {
    expect(topWeekStart(Date.parse("2026-11-19T00:00:00Z"))).toBe("2026-11-12T00:00:00.000Z");
  });
});

describe("thumbnail hosts", () => {
  it.each([
    "i.ytimg.com",
    "clips-media-assets2.twitch.tv",
    "static-cdn.jtvnw.net",
    "p16-sign-va.tiktokcdn.com",
    "p19-common-sign.tiktokcdn-us.com",
  ])("allows %s", (host) => {
    expect(isAllowedThumbnailHost(host)).toBe(true);
  });

  it.each(["evil.com", "i.ytimg.com.evil.com", "tiktokcdn.com.evil.com", "eviltiktokcdn.com", "ytimg.com"])(
    "refuses %s",
    (host) => {
      expect(isAllowedThumbnailHost(host)).toBe(false);
    },
  );
});

describe("embed URLs for JSON-LD", () => {
  it("uses each platform's own player", () => {
    expect(publicEmbedUrl("youtube", "dQw4w9WgXcQ", "example.com")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(publicEmbedUrl("twitch", "Slug-1", "example.com")).toBe(
      "https://clips.twitch.tv/embed?clip=Slug-1&parent=example.com",
    );
    expect(publicEmbedUrl("tiktok", "123", "example.com")).toBe(tiktokEmbedUrl("123"));
    expect(tiktokEmbedUrl("123")).toBe("https://www.tiktok.com/embed/v2/123");
  });
});

describe("clipErrorMessage", () => {
  it("names the platform and the duration where it helps", () => {
    expect(clipErrorMessage("not_configured", { platform: "youtube" })).toMatch(/^YouTube links can't be checked yet/);
    expect(clipErrorMessage("upstream", { platform: "twitch" })).toBe(
      "Twitch didn't answer. Please try again in a minute.",
    );
    expect(clipErrorMessage("too_long", { durationSec: 73 })).toBe("Clips can be up to 1:00 long. This one is 1:13.");
    expect(clipErrorMessage("not_gta")).toMatch(/isn't from GTA VI/);
  });
});
