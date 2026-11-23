import type { Metadata } from "next";
import { RemovalForm } from "@/components/legal/removal-form";
import { LegalPage } from "@/components/shared/legal-page";
import { LEGAL_DRAFT_UPDATED } from "@/config/legal";
import { siteConfig } from "@/config/site";
import { integrations } from "@/env";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/sitemap";
import { getClip } from "@/server/clips/queries";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Content removal (DMCA)",
    path: "/dmca",
    description:
      "Creators and rights holders can ask us to remove a clip or other content. We usually act within 24 hours.",
  });
}

const POLICY = `
If something on ${siteConfig.name} uses your work without permission (a clip of your stream or video, your writing, or anything else you own), tell us and we'll review it, usually within 24 hours.

## Creators: removing a clip

Clips here are only the platforms' official players. The video stays on YouTube, Twitch or TikTok, and the views count there. If you'd rather your clip wasn't featured, you don't need a formal legal notice: tell us which clip is yours and we'll take it down. The "I'm the creator: remove this" link on every clip page fills in the form for you.

## What to include

- The page on this site where the content appears.
- Your name and an email address we can reply to.
- What the work is, and how it's yours (or that you act for its owner).
- A statement that the request is accurate and made in good faith.

## What happens next

- A moderator reviews every request and may email you if something is unclear.
- If the request is valid, we remove the content.
- If something you posted was removed and you think that was a mistake, [contact us](/contact) with the details.

We keep removal requests on record. Knowingly sending a false request can have legal consequences. See also the [Terms](/terms), the [Community guidelines](/community-guidelines) and the [Credits](/credits).
`;

/** SPEC §14 DMCA / content removal; reads `?clip=<id>` from the clip page's removal link (D-076, D-098). */
export default async function ContentRemovalPage({ searchParams }: PageProps<"/dmca">) {
  const { clip } = await searchParams;
  const clipId = typeof clip === "string" && /^\d{1,15}$/.test(clip) ? Number(clip) : null;
  const found = clipId ? await getClip(clipId) : null;

  return (
    <LegalPage
      title="Content removal"
      description="Creators and rights holders can ask us to remove a clip or other content."
      updated={LEGAL_DRAFT_UPDATED}
      source={POLICY}
    >
      <RemovalForm
        enabled={integrations.supabaseAdmin}
        clipId={found ? found.id : undefined}
        clipTitle={found?.title}
        defaultUrl={found ? absoluteUrl(siteConfig.url, routes.clip(found.id)) : undefined}
      />
    </LegalPage>
  );
}
