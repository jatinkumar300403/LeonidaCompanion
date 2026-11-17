import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Impressum", path: "/impressum", description: "Legal notice." });
}

/** Only exists when NEXT_PUBLIC_SHOW_IMPRESSUM=true (SPEC §1/§14). */
export default function ImpressumPage() {
  if (!siteConfig.showImpressum) notFound();

  return (
    <StubPage
      eyebrow="Legal"
      title="Impressum"
      icon={FileText}
      emptyTitle="This page is being written"
      emptyDescription="The legal notice goes up here."
      links={[{ href: "/contact", label: "Contact us", primary: true }]}
    />
  );
}
