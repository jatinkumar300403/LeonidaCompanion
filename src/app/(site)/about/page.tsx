import type { Metadata } from "next";
import { Info } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "About",
    path: "/about",
    description: "An unofficial, fan-made GTA VI guide and community.",
  });
}

export default function AboutPage() {
  return (
    <StubPage
      eyebrow="About"
      title={`About ${siteConfig.name}`}
      description="An unofficial, fan-made GTA VI guide and community."
      icon={Info}
      emptyTitle="This page is being written"
      emptyDescription="A plain-English version goes up shortly."
      links={[{ href: "/disclaimer", label: "Read the disclaimer", primary: true }]}
    />
  );
}
