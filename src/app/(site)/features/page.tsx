import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Features Explained",
    path: "/features",
    description: "How GTA 6's systems work, explained in plain English, with what is and isn't confirmed.",
  });
}

export default function FeaturesPage() {
  return (
    <StubPage
      eyebrow="Features Explained"
      title="GTA 6 features explained"
      description="How the game's systems work, and what isn't confirmed yet."
      icon={BookOpen}
      emptyTitle="Explainers are on the way"
      emptyDescription="Each one covers what a mechanic is, how it works and what isn't confirmed yet."
      links={[
        { href: "/ask", label: "Ask AI", primary: true },
        { href: "/tips", label: "Browse tips" },
      ]}
    />
  );
}
