/** JSON-LD builders (SPEC §13). Serialise with `serializeJsonLd` before putting it in a <script>. */

export function websiteJsonLd({ name, url }: { name: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  } as const;
}

/** JSON.stringify that can't close the surrounding <script> tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type Crumb = { name: string; url: string };

export function breadcrumbJsonLd(items: readonly Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  } as const;
}

export function articleJsonLd({
  title,
  description,
  url,
  imageUrl,
  publishedAt,
  updatedAt,
  siteName,
  siteUrl,
  section,
  tags,
}: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedAt: string | null;
  updatedAt: string;
  siteName: string;
  siteUrl: string;
  section: string;
  tags: readonly string[];
}) {
  const publisher = { "@type": "Organization", name: siteName, url: siteUrl, logo: `${siteUrl}/icon.svg` } as const;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title.slice(0, 110),
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: [imageUrl],
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    dateModified: updatedAt,
    articleSection: section,
    ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
    author: publisher,
    publisher,
    inLanguage: "en",
  } as const;
}

/** A forum author; deleted accounts still need a name for the structured data. */
export type ForumPerson = { name: string; url?: string | null };

export type ForumAnswerLd = {
  text: string;
  url: string;
  dateCreated: string;
  upvoteCount: number;
  author: ForumPerson;
};

function person(author: ForumPerson) {
  return { "@type": "Person", name: author.name, ...(author.url ? { url: author.url } : {}) } as const;
}

function answer(item: ForumAnswerLd) {
  return {
    "@type": "Answer",
    text: item.text,
    url: item.url,
    dateCreated: item.dateCreated,
    upvoteCount: item.upvoteCount,
    author: person(item.author),
  } as const;
}

/** SPEC §5/§13: Help & Questions threads with an accepted answer. */
export function qaPageJsonLd({
  title,
  text,
  url,
  dateCreated,
  upvoteCount,
  answerCount,
  author,
  accepted,
  suggested,
}: {
  title: string;
  text: string;
  url: string;
  dateCreated: string;
  upvoteCount: number;
  answerCount: number;
  author: ForumPerson;
  accepted: ForumAnswerLd;
  suggested: readonly ForumAnswerLd[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: title,
      text,
      url,
      dateCreated,
      upvoteCount,
      answerCount,
      author: person(author),
      acceptedAnswer: answer(accepted),
      ...(suggested.length > 0 ? { suggestedAnswer: suggested.map(answer) } : {}),
    },
  } as const;
}

/** SPEC §13: every other thread. */
export function discussionForumPostingJsonLd({
  title,
  text,
  url,
  datePublished,
  dateModified,
  author,
  commentCount,
  upvoteCount,
  comments,
}: {
  title: string;
  text: string;
  url: string;
  datePublished: string;
  dateModified?: string | null;
  author: ForumPerson;
  commentCount: number;
  upvoteCount: number;
  comments: readonly { text: string; url: string; datePublished: string; author: ForumPerson }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: title.slice(0, 110),
    text,
    url,
    mainEntityOfPage: url,
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    author: person(author),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: commentCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: upvoteCount,
      },
    ],
    ...(comments.length > 0
      ? {
          comment: comments.map((comment) => ({
            "@type": "Comment",
            text: comment.text,
            url: comment.url,
            datePublished: comment.datePublished,
            author: person(comment.author),
          })),
        }
      : {}),
  } as const;
}

export function faqJsonLd(items: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } as const;
}

/**
 * SPEC §13: clip pages. `embedUrl` is the platform's own player (we never host the video, so there
 * is no `contentUrl`). Google needs a thumbnail, so callers pass the OG image when the platform
 * gave none.
 */
export function clipVideoJsonLd({
  title,
  description,
  url,
  embedUrl,
  thumbnailUrl,
  uploadDate,
  durationIso,
  creator,
  upvoteCount,
}: {
  title: string;
  description: string;
  url: string;
  embedUrl: string;
  thumbnailUrl: string;
  uploadDate: string;
  durationIso?: string | null;
  creator?: ForumPerson | null;
  upvoteCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title.slice(0, 110),
    description,
    url,
    embedUrl,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    ...(durationIso ? { duration: durationIso } : {}),
    ...(creator ? { creator: person(creator) } : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: Math.max(0, upvoteCount),
    },
  } as const;
}
