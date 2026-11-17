import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Help Forum",
    path: "/forum",
    description: "Ask GTA 6 questions, share discoveries and help other players.",
  });
}

export default function ForumPage() {
  return (
    <StubPage
      eyebrow="Help Forum"
      title="GTA 6 help forum"
      description="Ask questions, share discoveries and help other players."
      icon={MessagesSquare}
      emptyTitle="The forum opens at launch"
      emptyDescription="Threads, answers and accepted solutions will live here."
      links={[
        { href: "/forum/new", label: "Start a thread", primary: true },
        { href: "/ask", label: "Ask AI" },
      ]}
    />
  );
}
