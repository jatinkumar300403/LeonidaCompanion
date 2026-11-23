import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  clipVideoJsonLd,
  discussionForumPostingJsonLd,
  faqJsonLd,
  qaPageJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "./jsonld";

/**
 * Every JSON-LD builder against the shape Google's structured-data docs require (Phase 9:
 * "validate all JSON-LD with a unit test against schema shapes"). Required fields are checked,
 * URLs must be absolute, dates ISO 8601, and the payload must survive serialisation.
 */
const absoluteUrl = z.url({ protocol: /^https$/ });
const isoDate = z.iso.datetime({ offset: true });
const context = z.literal("https://schema.org");
const person = z.object({ "@type": z.literal("Person"), name: z.string().min(1), url: absoluteUrl.optional() });

const website = z.object({
  "@context": context,
  "@type": z.literal("WebSite"),
  name: z.string().min(1),
  url: absoluteUrl,
  potentialAction: z.object({
    "@type": z.literal("SearchAction"),
    target: z.object({
      "@type": z.literal("EntryPoint"),
      urlTemplate: z.string().includes("{search_term_string}"),
    }),
    "query-input": z.literal("required name=search_term_string"),
  }),
});

const breadcrumb = z.object({
  "@context": context,
  "@type": z.literal("BreadcrumbList"),
  itemListElement: z
    .array(
      z.object({
        "@type": z.literal("ListItem"),
        position: z.number().int().positive(),
        name: z.string().min(1),
        item: absoluteUrl,
      }),
    )
    .min(1),
});

const organization = z.object({ "@type": z.literal("Organization"), name: z.string().min(1), url: absoluteUrl });

const article = z.object({
  "@context": context,
  "@type": z.literal("Article"),
  headline: z.string().min(1).max(110),
  description: z.string(),
  url: absoluteUrl,
  image: z.array(absoluteUrl).min(1),
  datePublished: isoDate,
  dateModified: isoDate,
  author: organization,
  publisher: organization.extend({ logo: absoluteUrl }),
});

const faq = z.object({
  "@context": context,
  "@type": z.literal("FAQPage"),
  mainEntity: z
    .array(
      z.object({
        "@type": z.literal("Question"),
        name: z.string().min(1),
        acceptedAnswer: z.object({ "@type": z.literal("Answer"), text: z.string().min(1) }),
      }),
    )
    .min(1),
});

const answer = z.object({
  "@type": z.literal("Answer"),
  text: z.string().min(1),
  url: absoluteUrl,
  dateCreated: isoDate,
  upvoteCount: z.number().int(),
  author: person,
});

const qaPage = z.object({
  "@context": context,
  "@type": z.literal("QAPage"),
  mainEntity: z.object({
    "@type": z.literal("Question"),
    name: z.string().min(1),
    text: z.string().min(1),
    answerCount: z.number().int().nonnegative(),
    dateCreated: isoDate,
    author: person,
    acceptedAnswer: answer,
    suggestedAnswer: z.array(answer).optional(),
  }),
});

const discussion = z.object({
  "@context": context,
  "@type": z.literal("DiscussionForumPosting"),
  headline: z.string().min(1).max(110),
  text: z.string().min(1),
  url: absoluteUrl,
  datePublished: isoDate,
  author: person,
  comment: z
    .array(
      z.object({
        "@type": z.literal("Comment"),
        text: z.string().min(1),
        datePublished: isoDate,
        author: person,
      }),
    )
    .optional(),
});

const video = z.object({
  "@context": context,
  "@type": z.literal("VideoObject"),
  name: z.string().min(1),
  description: z.string().min(1),
  thumbnailUrl: z.array(absoluteUrl).min(1),
  uploadDate: isoDate,
  embedUrl: absoluteUrl,
  duration: z.string().regex(/^PT/).optional(),
});

const SITE = "https://example.com";
const NOW = "2026-11-19T09:00:00.000Z";
const someone = { name: "dusk_runner", url: `${SITE}/u/dusk_runner` };
const reply = {
  text: "Hold the brake.",
  url: `${SITE}/forum/t/1/x#post-2`,
  dateCreated: NOW,
  upvoteCount: 3,
  author: someone,
};

const CASES: [string, z.ZodType, unknown][] = [
  ["WebSite + SearchAction", website, websiteJsonLd({ name: "Atlas", url: SITE })],
  [
    "BreadcrumbList",
    breadcrumb,
    breadcrumbJsonLd([
      { name: "Home", url: `${SITE}/` },
      { name: "Tips", url: `${SITE}/tips` },
    ]),
  ],
  [
    "Article",
    article,
    articleJsonLd({
      title: "How to lose a wanted level",
      description: "Break line of sight.",
      url: `${SITE}/tips/lose-wanted-level`,
      imageUrl: `${SITE}/api/og?title=x`,
      publishedAt: NOW,
      updatedAt: NOW,
      siteName: "Atlas",
      siteUrl: SITE,
      section: "Tips",
      tags: ["police"],
    }),
  ],
  ["FAQPage", faq, faqJsonLd([{ question: "Is it out?", answer: "Yes." }])],
  [
    "QAPage",
    qaPage,
    qaPageJsonLd({
      title: "How do I drift?",
      text: "Asking for a friend.",
      url: `${SITE}/forum/t/1/x`,
      dateCreated: NOW,
      upvoteCount: 2,
      answerCount: 1,
      author: someone,
      accepted: reply,
      suggested: [reply],
    }),
  ],
  [
    "DiscussionForumPosting",
    discussion,
    discussionForumPostingJsonLd({
      title: "Favourite car so far?",
      text: "Mine is the convertible.",
      url: `${SITE}/forum/t/2/y`,
      datePublished: NOW,
      author: { name: "Deleted user" },
      commentCount: 1,
      upvoteCount: 0,
      comments: [{ text: "Same.", url: `${SITE}/forum/t/2/y#post-3`, datePublished: NOW, author: someone }],
    }),
  ],
  [
    "VideoObject",
    video,
    clipVideoJsonLd({
      title: "Perfect landing",
      description: "A stunt clip.",
      url: `${SITE}/clips/7`,
      embedUrl: "https://www.youtube-nocookie.com/embed/abc123def45",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123def45/hqdefault.jpg",
      uploadDate: NOW,
      durationIso: "PT22S",
      creator: someone,
      upvoteCount: 5,
    }),
  ],
];

describe("JSON-LD shapes (SPEC §13)", () => {
  it.each(CASES)("%s has Google's required fields", (_name, schema, data) => {
    const result = schema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues, null, 2)).toBe(true);
  });

  it.each(CASES)("%s survives serialisation into a script tag", (_name, _schema, data) => {
    const text = serializeJsonLd(data);
    expect(text).not.toMatch(/<\/?script/i);
    expect(JSON.parse(text)).toEqual(data);
  });

  it("rejects a relative URL (shape check is strict)", () => {
    expect(website.safeParse(websiteJsonLd({ name: "Atlas", url: "/relative" })).success).toBe(false);
  });
});
