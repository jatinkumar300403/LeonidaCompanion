import { describe, expect, it } from "vitest";
import { clipVideoJsonLd } from "@/lib/seo/jsonld";
import twitchClipsTop from "./__fixtures__/twitch-clips-top.json";
import { selectAutoCandidates } from "./auto";
import { toClipDetail, toClipQueueItem, toClipSummary, type ClipRow } from "./model";
import { cleanText, safeThumbnailUrl } from "./thumbnails";

const row: ClipRow = {
  id: 7,
  platform: "youtube",
  external_id: "dQw4w9WgXcQ",
  url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  title: "Jet ski regret",
  caption: "||ending|| is wild",
  creator_name: "Fixture Gaming",
  creator_url: "https://www.youtube.com/channel/UC1",
  duration_sec: 24,
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  category: "funny",
  source: "user",
  submitted_by: "user-1",
  status: "approved",
  reject_reason: null,
  score: 12,
  views_on_platform: 48213,
  created_at: "2026-11-19T08:00:00Z",
  approved_at: "2026-11-19T09:00:00Z",
};

describe("clip rows → view models", () => {
  it("maps a row and derives portrait for Shorts", () => {
    expect(toClipSummary(row)).toEqual({
      id: 7,
      platform: "youtube",
      embedId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      title: "Jet ski regret",
      creatorName: "Fixture Gaming",
      creatorUrl: "https://www.youtube.com/channel/UC1",
      durationSec: 24,
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      category: "funny",
      score: 12,
      orientation: "portrait",
      caption: "||ending|| is wild",
      submittedBy: "user-1",
    });
    expect(toClipSummary({ ...row, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }).orientation).toBe("landscape");
  });

  it("adds page and queue fields", () => {
    expect(toClipDetail(row, "sam")).toMatchObject({
      source: "user",
      submitterUsername: "sam",
      viewsOnPlatform: 48213,
    });
    expect(toClipQueueItem({ ...row, status: "rejected", reject_reason: "Duplicate" }, null)).toMatchObject({
      status: "rejected",
      rejectReason: "Duplicate",
      submitterUsername: null,
    });
  });
});

describe("auto-candidates", () => {
  it("keeps GTA VI clips up to 60 seconds, once each", () => {
    const clips = [
      ...twitchClipsTop.data,
      twitchClipsTop.data[0]!,
      { ...twitchClipsTop.data[0]!, id: "Other", game_id: "1" },
    ];
    expect(selectAutoCandidates(clips, "9990001").map((clip) => clip.id)).toEqual([
      "TopClipOne-AbC123",
      "OddThumbThree-Ghi789",
    ]);
  });
});

describe("platform text and thumbnails", () => {
  it("keeps https thumbnails on allowlisted hosts only", () => {
    expect(safeThumbnailUrl("https://i.ytimg.com/vi/x/hqdefault.jpg")).toBe("https://i.ytimg.com/vi/x/hqdefault.jpg");
    expect(safeThumbnailUrl("http://i.ytimg.com/vi/x/hqdefault.jpg")).toBeNull();
    expect(safeThumbnailUrl("https://evil.example/x.jpg")).toBeNull();
    expect(safeThumbnailUrl("javascript:alert(1)")).toBeNull();
    expect(safeThumbnailUrl(42)).toBeNull();
  });

  it("collapses whitespace and clamps to the column limit", () => {
    expect(cleanText("  a \n b  ", 10)).toBe("a b");
    expect(cleanText("x".repeat(205), 200)).toHaveLength(200);
    expect(cleanText("   ", 10)).toBeNull();
    expect(cleanText(undefined, 10)).toBeNull();
  });
});

describe("clipVideoJsonLd", () => {
  it("builds a VideoObject that points at the platform's player", () => {
    const data = clipVideoJsonLd({
      title: "Jet ski regret",
      description: "Funny GTA 6 clip on YouTube.",
      url: "https://example.com/clips/7",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      uploadDate: "2026-11-19T09:00:00Z",
      durationIso: "PT24S",
      creator: { name: "Fixture Gaming", url: "https://www.youtube.com/channel/UC1" },
      upvoteCount: 12,
    });
    expect(data).toMatchObject({
      "@type": "VideoObject",
      name: "Jet ski regret",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      thumbnailUrl: ["https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
      uploadDate: "2026-11-19T09:00:00Z",
      duration: "PT24S",
      creator: { "@type": "Person", name: "Fixture Gaming" },
    });
    expect(data).not.toHaveProperty("contentUrl");
  });
});
