import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { humanizeSlug } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/forum/t/[id]/[slug]">): Promise<Metadata> {
  const { id, slug } = await params;
  return buildMetadata({
    title: humanizeSlug(slug),
    section: "Forum",
    path: routes.thread(Number(id), slug),
    noindex: true,
  });
}

export default async function ThreadPage({ params }: PageProps<"/forum/t/[id]/[slug]">) {
  const { slug } = await params;
  return (
    <StubPage
      eyebrow="Help Forum"
      title={humanizeSlug(slug)}
      icon={MessageSquare}
      emptyTitle="This thread isn't available"
      emptyDescription="It may not exist yet, or it was removed."
      links={[{ href: "/forum", label: "Back to the forum", primary: true }]}
    />
  );
}
