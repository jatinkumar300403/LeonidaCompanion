import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Privacy",
    path: "/privacy",
    description: "What we collect, why, and how to export or delete your data.",
  });
}

export default function PrivacyPage() {
  return (
    <StubPage
      eyebrow="Legal"
      title="Privacy"
      description="What we collect, why, and how to export or delete your data."
      icon={ShieldCheck}
      emptyTitle="This page is being written"
      emptyDescription="A plain-English privacy policy goes up before accounts open."
      links={[{ href: "/contact", label: "Contact us", primary: true }]}
    />
  );
}
