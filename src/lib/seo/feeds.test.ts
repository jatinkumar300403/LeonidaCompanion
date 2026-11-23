import { describe, expect, it } from "vitest";
import { rssXml } from "./rss";
import {
  absoluteUrl,
  escapeXml,
  newestLastmod,
  sectionFromFile,
  SITEMAP_SECTIONS,
  sitemapIndexXml,
  toLastmod,
  urlsetXml,
} from "./sitemap";

describe("sitemaps (SPEC §13)", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`a&b<c>"d'`)).toBe("a&amp;b&lt;c&gt;&quot;d&apos;");
  });

  it("maps section files and refuses anything else", () => {
    expect(sectionFromFile("tips.xml")).toBe("tips");
    expect(sectionFromFile("forum.xml")).toBe("forum");
    expect(sectionFromFile("admin.xml")).toBeNull();
    expect(sectionFromFile("tips.xml.gz")).toBeNull();
    expect(sectionFromFile("../tips.xml")).toBeNull();
    expect(SITEMAP_SECTIONS).toEqual(["pages", "tips", "features", "facts", "forum", "clips"]);
  });

  it("normalises lastmod and picks the newest", () => {
    expect(toLastmod("2026-11-19T10:00:00+05:30")).toBe("2026-11-19T04:30:00.000Z");
    expect(toLastmod("not a date")).toBeNull();
    expect(toLastmod(null)).toBeNull();
    expect(
      newestLastmod([
        { url: "a", lastModified: "2026-11-18T00:00:00Z" },
        { url: "b", lastModified: "2026-11-20T00:00:00Z" },
        { url: "c" },
      ]),
    ).toBe("2026-11-20T00:00:00.000Z");
    expect(newestLastmod([{ url: "a" }])).toBeNull();
  });

  it("builds a urlset with escaped, de-duplicated locations", () => {
    const xml = urlsetXml([
      { url: "https://example.com/tips/a?x=1&y=2", lastModified: "2026-11-19T00:00:00Z" },
      { url: "https://example.com/tips/a?x=1&y=2" },
      { url: "https://example.com/tips/b" },
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(
      "<url><loc>https://example.com/tips/a?x=1&amp;y=2</loc><lastmod>2026-11-19T00:00:00.000Z</lastmod></url>",
    );
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain("<url><loc>https://example.com/tips/b</loc></url>");
  });

  it("builds a sitemap index", () => {
    const xml = sitemapIndexXml([
      { url: "https://example.com/sitemaps/tips.xml", lastModified: "2026-11-19T00:00:00Z" },
    ]);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(
      "<sitemap><loc>https://example.com/sitemaps/tips.xml</loc><lastmod>2026-11-19T00:00:00.000Z</lastmod></sitemap>",
    );
  });

  it("resolves paths against the site URL", () => {
    expect(absoluteUrl("https://example.com", "/tips/x")).toBe("https://example.com/tips/x");
    expect(absoluteUrl("https://example.com/", "/")).toBe("https://example.com/");
    expect(absoluteUrl("http://localhost:3000", "/sitemaps/tips.xml")).toBe("http://localhost:3000/sitemaps/tips.xml");
  });
});

describe("rss.xml (SPEC §13)", () => {
  const feed = rssXml({
    title: "Atlas & friends",
    siteUrl: "https://example.com/",
    feedUrl: "https://example.com/rss.xml",
    description: "Guides",
    items: [
      {
        title: "Lose a <wanted> level",
        url: "https://example.com/tips/lose",
        description: "Break line of sight & hide.",
        publishedAt: "2026-11-19T08:00:00Z",
        category: "Tips",
      },
    ],
  });

  it("is an RSS 2.0 channel with a self link", () => {
    expect(feed).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(feed).toContain("<title>Atlas &amp; friends</title>");
    expect(feed).toContain('<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(feed).toContain("<lastBuildDate>Thu, 19 Nov 2026 08:00:00 GMT</lastBuildDate>");
  });

  it("escapes item text and uses RFC 822 dates", () => {
    expect(feed).toContain("<title>Lose a &lt;wanted&gt; level</title>");
    expect(feed).toContain('<guid isPermaLink="true">https://example.com/tips/lose</guid>');
    expect(feed).toContain("<description>Break line of sight &amp; hide.</description>");
    expect(feed).toContain("<pubDate>Thu, 19 Nov 2026 08:00:00 GMT</pubDate>");
  });

  it("works with no items", () => {
    const empty = rssXml({ title: "A", siteUrl: "https://example.com/", feedUrl: "x", description: "d", items: [] });
    expect(empty).not.toContain("<item>");
    expect(empty).not.toContain("lastBuildDate");
  });
});
