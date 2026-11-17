import type { Metadata } from "next";
import { ArticleRoute, articleMetadata } from "@/components/articles/article-routes";

// ISR (D-050): pages render on first visit, then stay cached until the publish pipeline's tags
// invalidate them or 10 minutes pass.
export const revalidate = 600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/facts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("fact", slug);
}

export default async function FactPage({ params }: PageProps<"/facts/[slug]">) {
  const { slug } = await params;
  return <ArticleRoute type="fact" slug={slug} />;
}
