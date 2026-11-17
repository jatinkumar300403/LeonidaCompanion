import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Disclaimer",
    path: "/disclaimer",
    description: "This is an unofficial fan site, not affiliated with Rockstar Games or Take-Two Interactive.",
  });
}

export default function DisclaimerPage() {
  return (
    <StubPage
      eyebrow="Legal"
      title="Disclaimer"
      icon={FileText}
      emptyTitle="The full disclaimer is being written"
      emptyDescription="A plain-English version, including how we handle mistakes, goes up shortly."
      links={[{ href: "/contact", label: "Contact us", primary: true }]}
    >
      <Card accent className="max-w-3xl p-5 sm:p-6">
        <p className="text-base leading-relaxed">{siteConfig.disclaimer}</p>
      </Card>
    </StubPage>
  );
}
