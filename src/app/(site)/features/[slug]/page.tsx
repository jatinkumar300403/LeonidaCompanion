import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { humanizeSlug } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/features/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({ title: humanizeSlug(slug), section: "Features", path: routes.feature(slug), noindex: true });
}

export default async function FeaturePage({ params }: PageProps<"/features/[slug]">) {
  const { slug } = await params;
  return (
    <StubPage
      eyebrow="Features Explained"
      title={humanizeSlug(slug)}
      icon={BookOpen}
      emptyTitle="This explainer isn't published yet"
      emptyDescription="Explainers go live once they're written and checked."
      links={[{ href: "/features", label: "All features", primary: true }]}
    />
  );
}
