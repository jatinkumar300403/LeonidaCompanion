import { serializeJsonLd } from "@/lib/seo/jsonld";

/** Structured data for search engines. Server-rendered; the payload is escaped. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
