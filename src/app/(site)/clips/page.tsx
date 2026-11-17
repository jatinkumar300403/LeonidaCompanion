import type { Metadata } from "next";
import { Clapperboard } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Clips",
    path: "/clips",
    description: "Funny, epic and fail-worthy GTA 6 moments from streamers, shown through official embeds.",
  });
}

export default function ClipsPage() {
  return (
    <StubPage
      eyebrow="Clips"
      title="GTA 6 clips"
      description="Funny, epic and fail-worthy moments from streamers, shown through official embeds."
      icon={Clapperboard}
      emptyTitle="Clips arrive with launch"
      emptyDescription="We only show clips through official Twitch, YouTube and TikTok embeds, and always credit the creator."
      links={[{ href: "/clips/submit", label: "Submit a clip", primary: true }]}
    />
  );
}
