import { escapeXml } from "@/lib/seo/sitemap";

/** RSS 2.0 feed for articles (SPEC §13 `rss.xml`, D-096). Pure; dates are RFC 822 via toUTCString. */
export type RssItem = {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  category: string;
};

export type RssChannel = {
  title: string;
  siteUrl: string;
  feedUrl: string;
  description: string;
  items: readonly RssItem[];
  /** Defaults to the newest item's date. */
  lastBuildDate?: string;
};

function rfc822(value: string): string | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toUTCString();
}

function itemXml(item: RssItem): string {
  const pubDate = rfc822(item.publishedAt);
  return [
    "<item>",
    `<title>${escapeXml(item.title)}</title>`,
    `<link>${escapeXml(item.url)}</link>`,
    `<guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
    `<description>${escapeXml(item.description)}</description>`,
    `<category>${escapeXml(item.category)}</category>`,
    pubDate ? `<pubDate>${pubDate}</pubDate>` : "",
    "</item>",
  ].join("");
}

export function rssXml(channel: RssChannel): string {
  const newest = channel.lastBuildDate ?? channel.items[0]?.publishedAt;
  const lastBuild = newest ? rfc822(newest) : null;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.siteUrl)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    "<language>en</language>",
    `<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    lastBuild ? `<lastBuildDate>${lastBuild}</lastBuildDate>` : "",
    ...channel.items.map(itemXml),
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}
