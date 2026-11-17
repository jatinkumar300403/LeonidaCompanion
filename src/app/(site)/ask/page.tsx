import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Sparkles } from "lucide-react";
import { AskBox } from "@/components/ask/ask-box";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { SUGGESTED_QUESTIONS } from "@/config/site";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Ask AI about GTA 6",
    path: "/ask",
    description: "Ask a GTA 6 question and get a short answer with cited sources, or “Not confirmed yet”.",
  });
}

/** Stub until Phase 8 streams answers. Keeps the question so it can go to the forum instead. */
export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const { q } = await searchParams;
  const question = typeof q === "string" ? q.trim().slice(0, 300) : "";

  return (
    <div className="page-container py-10 sm:py-14">
      <PageHeader
        eyebrow="Ask AI"
        title="Ask anything about GTA VI"
        description="Short answers that cite their sources. When the sources don't cover it, you'll see “Not confirmed yet”."
      />
      <AskBox className="mt-8 max-w-3xl" defaultValue={question} suggestions={question ? [] : SUGGESTED_QUESTIONS} />
      <EmptyState
        className="mt-10"
        icon={Sparkles}
        title={question ? "Ask AI isn't answering yet" : "Ask AI opens at launch"}
        description={
          question ? (
            <>
              We saved your question: <span className="font-medium text-foreground">&ldquo;{question}&rdquo;</span>. Ask
              the community instead, or check back soon.
            </>
          ) : (
            "Answers come from our guides, accepted forum answers and licensed wiki sources, always with citations."
          )
        }
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href={routes.newThread(question || undefined)}>
              <MessagesSquare aria-hidden="true" />
              Ask the community
            </Link>
          </Button>
        }
      />
    </div>
  );
}
