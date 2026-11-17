import type { Metadata } from "next";
import { Gavel } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Content removal (DMCA)",
    path: "/dmca",
    description: "Creators can ask us to remove a clip or other content. We act within 24 hours.",
  });
}

export default function ContentRemovalPage() {
  return (
    <StubPage
      eyebrow="Legal"
      title="Content removal"
      description="Creators can ask us to remove a clip or other content. We act within 24 hours."
      icon={Gavel}
      emptyTitle="The removal form opens soon"
      emptyDescription="Until it does, use the contact page and we'll handle your request within 24 hours."
      links={[{ href: "/contact", label: "Contact us", primary: true }]}
    />
  );
}
