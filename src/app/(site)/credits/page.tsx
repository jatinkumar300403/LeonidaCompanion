import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Credits",
    path: "/credits",
    description: "Our sources, their licences, and the creators whose clips we embed.",
  });
}

/**
 * SPEC §14 credits. The wiki sources section fills in once the knowledge base (Phase 7) is on:
 * each source in src/config/sources.ts is listed with its licence and attribution (rule 4).
 */
const POLICY = `
## Clips

Clips belong to their creators and are shown via official embeds. Every clip plays in the official YouTube, Twitch or TikTok player: we never download, re-upload or re-encode video. Each clip page credits its creator and links to the original. Creators can ask us to remove a clip with the [removal form](/dmca).

## Knowledge sources

Ask AI and some guides will draw on wiki text whose licence allows it. When the knowledge base is switched on, every source is listed here with its licence and the attribution it asks for, and answers that use a source show that attribution too. We use text only, never images.

## Fonts

[Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque), [Inter](https://fonts.google.com/specimen/Inter) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), all under the SIL Open Font License 1.1.

## Open-source software

${siteConfig.name} is built with open-source software, including Next.js, React, Tailwind CSS, shadcn/ui and Radix UI, Lucide icons, the Supabase client libraries, react-markdown and the unified (remark and rehype) ecosystem, Zod, Serwist and Sonner (MIT or ISC licences). Thank you to everyone who builds and maintains them.

## Artwork

The logo, the palm pattern and every illustration on the site are original. We don't use game artwork, logos or fonts (see the [Disclaimer](/disclaimer)).
`;

export default function CreditsPage() {
  return (
    <LegalPage
      eyebrow="About"
      title="Credits"
      description="Our sources, their licences, and the creators whose clips we embed."
      updated={LEGAL_DRAFT_UPDATED}
      source={POLICY}
    />
  );
}
