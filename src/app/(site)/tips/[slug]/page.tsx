import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { humanizeSlug } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/tips/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({ title: humanizeSlug(slug), section: "Tips", path: routes.tip(slug), noindex: true });
}

export default async function TipPage({ params }: PageProps<"/tips/[slug]">) {
  const { slug } = await params;
  return (
    <StubPage
      eyebrow="Tips & Tricks"
      title={humanizeSlug(slug)}
      icon={Lightbulb}
      emptyTitle="This tip isn't published yet"
      emptyDescription="Tips go live as soon as they're checked. Browse the others meanwhile."
      links={[{ href: "/tips", label: "All tips", primary: true }]}
    />
  );
}
