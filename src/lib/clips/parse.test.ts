import { describe, expect, it } from "vitest";
import { clipOrientation, parseClipUrl, type ClipParseResult } from "./parse";

const ok = (result: ClipParseResult) => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.clip;
};

describe("parseClipUrl · YouTube", () => {
  const id = "dQw4w9WgXcQ";

  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&si=abc`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `http://www.youtube.com/watch?v=${id}`,
    `www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=xyz&t=10`,
    `https://www.youtube.com/embed/${id}?start=3`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `  https://youtu.be/${id}  `,
  ])("parses %s as a landscape video", (input) => {
    expect(ok(parseClipUrl(input))).toEqual({
      platform: "youtube",
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      orientation: "landscape",
    });
  });

  it.each([`https://www.youtube.com/shorts/${id}`, `https://youtube.com/shorts/${id}?feature=share`])(
    "parses Shorts (%s) as portrait",
    (input) => {
      expect(ok(parseClipUrl(input))).toEqual({
        platform: "youtube",
        id,
        url: `https://www.youtube.com/shorts/${id}`,
        orientation: "portrait",
      });
    },
  );

  it.each([
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/@channel",
    "https://www.youtube.com/playlist?list=PL123",
    "https://youtu.be/",
    `https://youtu.be/${id}extra`,
  ])("refuses %s", (input) => {
    expect(parseClipUrl(input)).toEqual({ ok: false, error: "not_a_clip" });
  });
});

describe("parseClipUrl · Twitch", () => {
  const slug = "AwkwardHelplessSalamanderSwiftRage";
  const newSlug = "FunnyClip-AbC_12dEf";

  it.each([
    [`https://clips.twitch.tv/${slug}`, slug],
    [`https://clips.twitch.tv/embed?clip=${slug}&parent=example.com`, slug],
    [`https://www.twitch.tv/somestreamer/clip/${newSlug}`, newSlug],
    [`https://twitch.tv/somestreamer/clip/${newSlug}?filter=clips&range=7d&sort=time`, newSlug],
    [`https://m.twitch.tv/somestreamer/clip/${slug}`, slug],
    [`https://m.twitch.tv/clip/${slug}`, slug],
  ])("parses %s", (input, expected) => {
    expect(ok(parseClipUrl(input))).toEqual({
      platform: "twitch",
      id: expected,
      url: `https://clips.twitch.tv/${expected}`,
      orientation: "landscape",
    });
  });

  it.each([
    "https://www.twitch.tv/somestreamer",
    "https://www.twitch.tv/videos/123456",
    "https://www.twitch.tv/somestreamer/clips",
    "https://clips.twitch.tv/",
    "https://clips.twitch.tv/embed",
    "https://clips.twitch.tv/a/b",
  ])("refuses %s", (input) => {
    expect(parseClipUrl(input)).toEqual({ ok: false, error: "not_a_clip" });
  });
});

describe("parseClipUrl · TikTok", () => {
  const id = "6718335390845095173";

  it("parses a full video link", () => {
    expect(ok(parseClipUrl(`https://www.tiktok.com/@scout2015/video/${id}?is_from_webapp=1`))).toEqual({
      platform: "tiktok",
      id,
      url: `https://www.tiktok.com/@scout2015/video/${id}`,
      orientation: "portrait",
    });
  });

  it.each([
    `https://m.tiktok.com/v/${id}.html`,
    `https://www.tiktok.com/embed/v2/${id}`,
    `https://www.tiktok.com/player/v1/${id}`,
  ])("parses %s by id", (input) => {
    expect(ok(parseClipUrl(input))).toMatchObject({ platform: "tiktok", id });
  });

  it.each([
    ["https://vm.tiktok.com/ZMabc123/", "https://vm.tiktok.com/ZMabc123/"],
    ["https://vt.tiktok.com/ZSxyz789", "https://vt.tiktok.com/ZSxyz789/"],
    ["https://www.tiktok.com/t/ZT8abcdef/", "https://www.tiktok.com/t/ZT8abcdef/"],
  ])("keeps short link %s for oEmbed to resolve", (input, url) => {
    expect(ok(parseClipUrl(input))).toEqual({ platform: "tiktok", id: null, url, orientation: "portrait" });
  });

  it.each([
    "https://www.tiktok.com/@scout2015",
    "https://www.tiktok.com/@scout2015/video/notanid",
    "https://www.tiktok.com/",
  ])("refuses %s", (input) => {
    expect(parseClipUrl(input)).toEqual({ ok: false, error: "not_a_clip" });
  });
});

describe("parseClipUrl · invalid input", () => {
  it("reports empty input", () => {
    expect(parseClipUrl("")).toEqual({ ok: false, error: "empty" });
    expect(parseClipUrl("   ")).toEqual({ ok: false, error: "empty" });
  });

  it.each([
    "not a url",
    "javascript:alert(1)",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com:8080/watch?v=dQw4w9WgXcQ",
    `https://youtu.be/${"a".repeat(600)}`,
  ])("refuses %s as invalid", (input) => {
    expect(parseClipUrl(input)).toEqual({ ok: false, error: "invalid_url" });
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://clips.twitch.tv.example.com/Slug",
    "https://vimeo.com/123456",
    "https://example.com/@user/video/6718335390845095173",
  ])("refuses look-alike or unsupported site %s", (input) => {
    expect(parseClipUrl(input)).toEqual({ ok: false, error: "unsupported_site" });
  });
});

describe("clipOrientation", () => {
  it("derives portrait for TikTok and Shorts only", () => {
    expect(clipOrientation("tiktok", "https://www.tiktok.com/@a/video/1")).toBe("portrait");
    expect(clipOrientation("youtube", "https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("portrait");
    expect(clipOrientation("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("landscape");
    expect(clipOrientation("twitch", "https://clips.twitch.tv/Slug")).toBe("landscape");
  });
});
