import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { humanizeSlug } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/forum/[category]">): Promise<Metadata> {
  const { category } = await params;
  return buildMetadata({
    title: humanizeSlug(category),
    section: "Forum",
    path: routes.forumCategory(category),
    noindex: true,
  });
}

export default async function ForumCategoryPage({ params }: PageProps<"/forum/[category]">) {
  const { category } = await params;
  return (
    <StubPage
      eyebrow="Help Forum"
      title={humanizeSlug(category)}
      icon={MessagesSquare}
      emptyTitle="No threads here yet"
      emptyDescription="This category fills up once the forum opens at launch."
      links={[
        { href: "/forum/new", label: "Start a thread", primary: true },
        { href: "/forum", label: "All categories" },
      ]}
    />
  );
}
