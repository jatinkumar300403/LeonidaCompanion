import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Contact", path: "/contact", description: "How to reach the team behind the site." });
}

export default function ContactPage() {
  return (
    <StubPage
      eyebrow="About"
      title="Contact"
      description="How to reach the team behind the site."
      icon={Mail}
      emptyTitle="Contact details are on the way"
      emptyDescription="A contact form goes up shortly."
      links={[{ href: "/", label: "Go home", primary: true }]}
    />
  );
}
