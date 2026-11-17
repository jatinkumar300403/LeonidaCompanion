import { describe, expect, it } from "vitest";
import { buildEmbedSrc, twitchParentHosts } from "./embed";

describe("twitchParentHosts", () => {
  it("adds localhost and the current host, normalised and de-duplicated", () => {
    expect(twitchParentHosts(["example.com", "www.example.com"], "Preview-123.vercel.app:443")).toEqual([
      "example.com",
      "www.example.com",
      "localhost",
      "preview-123.vercel.app",
    ]);
    expect(twitchParentHosts(["localhost"], "localhost")).toEqual(["localhost"]);
  });
});

describe("buildEmbedSrc", () => {
  it("uses youtube-nocookie with autoplay and inline playback", () => {
    expect(buildEmbedSrc("youtube", "dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1",
    );
  });

  it("passes every parent host to Twitch", () => {
    const src = buildEmbedSrc("twitch", "FunnyClipSlug-abc", ["example.com", "localhost"]);
    const url = new URL(src!);
    expect(url.origin + url.pathname).toBe("https://clips.twitch.tv/embed");
    expect(url.searchParams.get("clip")).toBe("FunnyClipSlug-abc");
    expect(url.searchParams.getAll("parent")).toEqual(["example.com", "localhost"]);
  });

  it("escapes ids", () => {
    expect(buildEmbedSrc("youtube", "a/b?c")).toBe(
      "https://www.youtube-nocookie.com/embed/a%2Fb%3Fc?autoplay=1&playsinline=1",
    );
  });

  it("leaves TikTok to its own embed script", () => {
    expect(buildEmbedSrc("tiktok", "123")).toBeNull();
  });
});
