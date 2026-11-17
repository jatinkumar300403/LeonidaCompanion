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
