import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Credits",
    path: "/credits",
    description: "Our sources, their licences, and the creators whose clips we embed.",
  });
}

export default function CreditsPage() {
  return (
    <StubPage
      eyebrow="About"
      title="Credits"
      description="Our sources, their licences, and the creators whose clips we embed."
      icon={Heart}
      emptyTitle="Credits are being compiled"
      emptyDescription="Clips belong to their creators and are shown via official embeds. Wiki sources and licences are listed here once enabled."
      links={[{ href: "/about", label: "About the site", primary: true }]}
    />
  );
}
