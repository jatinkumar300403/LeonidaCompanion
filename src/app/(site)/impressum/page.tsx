import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Impressum", path: "/impressum", description: "Legal notice (Impressum)." });
}

/**
 * Only exists when NEXT_PUBLIC_SHOW_IMPRESSUM=true (SPEC §1/§14), for operating commercially from
 * Germany. OWNER: replace every [bracketed] field with your real details before switching it on.
 */
const NOTICE = `
Information according to § 5 DDG (Digitale-Dienste-Gesetz).

**[Full name or company name]**\\
[Street and number]\\
[Postcode and city]\\
Germany

## Contact

Email: [email address]

## Responsible for content under § 18 (2) MStV

[Full name], address as above.

## Disclaimer

${siteConfig.disclaimer}
`;

export default function ImpressumPage() {
  if (!siteConfig.showImpressum) notFound();

  return <LegalPage title="Impressum" description="Legal notice." updated={LEGAL_DRAFT_UPDATED} source={NOTICE} />;
}
