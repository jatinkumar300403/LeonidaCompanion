import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Submit a clip",
    path: "/clips/submit",
    description: "Share a GTA 6 clip from Twitch, YouTube or TikTok.",
    noindex: true,
  });
}

export default function SubmitClipPage() {
  return (
    <StubPage
      eyebrow="Clips"
      title="Submit a clip"
      description="Share a GTA 6 moment from Twitch, YouTube or TikTok."
      icon={Upload}
      emptyTitle="Clip submissions open at launch"
      emptyDescription="Paste a link, pick a category and a moderator reviews it. No re-uploads: official embeds only."
      links={[{ href: "/clips", label: "Back to clips", primary: true }]}
    />
  );
}
