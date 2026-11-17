import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Terms of use",
    path: "/terms",
    description: "The rules for using the site and posting content.",
  });
}

export default function TermsPage() {
  return (
    <StubPage
      eyebrow="Legal"
      title="Terms of use"
      description="The rules for using the site and posting content."
      icon={Scale}
      emptyTitle="This page is being written"
      emptyDescription="Plain-English terms go up before accounts open."
      links={[{ href: "/community-guidelines", label: "Community guidelines", primary: true }]}
    />
  );
}
