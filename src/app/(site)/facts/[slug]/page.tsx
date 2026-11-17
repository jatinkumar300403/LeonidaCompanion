import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { humanizeSlug } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/facts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({ title: humanizeSlug(slug), section: "Facts", path: routes.fact(slug), noindex: true });
}

export default async function FactPage({ params }: PageProps<"/facts/[slug]">) {
  const { slug } = await params;
  return (
    <StubPage
      eyebrow="Facts"
      title={humanizeSlug(slug)}
      icon={BadgeCheck}
      emptyTitle="This fact isn't published yet"
      emptyDescription="Facts only go up with a source."
      links={[{ href: "/facts", label: "All facts", primary: true }]}
    />
  );
}
