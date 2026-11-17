import type { Metadata } from "next";
import { Users } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Community guidelines",
    path: "/community-guidelines",
    description: "Be helpful, tag spoilers, and no cheats, exploits, leaks or harassment.",
  });
}

export default function CommunityGuidelinesPage() {
  return (
    <StubPage
      eyebrow="Community"
      title="Community guidelines"
      description="Be helpful, tag spoilers, and no cheats, exploits, leaks or harassment."
      icon={Users}
      emptyTitle="This page is being written"
      emptyDescription="The full guidelines go up before the forum opens."
      links={[{ href: "/forum", label: "Visit the forum", primary: true }]}
    />
  );
}
