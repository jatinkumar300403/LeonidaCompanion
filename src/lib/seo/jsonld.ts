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
