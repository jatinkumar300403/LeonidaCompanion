import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Tips & Tricks",
    path: "/tips",
    description: "Quick, tested GTA 6 tips for money, wanted levels, driving, settings and more.",
  });
}

export default function TipsPage() {
  return (
    <StubPage
      eyebrow="Tips & Tricks"
      title="GTA 6 tips & tricks"
      description="Short, tested answers. Spoiler-free unless marked."
      icon={Lightbulb}
      emptyTitle="The first tips land at launch"
      emptyDescription="We publish quick tips as players discover things. Until then, ask a question or browse the forum."
      links={[
        { href: "/ask", label: "Ask AI", primary: true },
        { href: "/forum", label: "Visit the forum" },
      ]}
    />
  );
}
