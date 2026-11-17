import type { Metadata } from "next";
import { MessageSquarePlus } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Start a thread",
    path: "/forum/new",
    description: "Start a new thread in the GTA 6 help forum.",
    noindex: true,
  });
}

export default function NewThreadPage() {
  return (
    <StubPage
      eyebrow="Help Forum"
      title="Start a thread"
      description="Posting needs an account."
      icon={MessageSquarePlus}
      emptyTitle="Posting opens at launch"
      emptyDescription="Sign-up and posting arrive with the forum. Ask AI in the meantime."
      links={[
        { href: "/ask", label: "Ask AI", primary: true },
        { href: "/forum", label: "Back to the forum" },
      ]}
    />
  );
}
