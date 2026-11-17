import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleRoute, articleMetadata } from "@/components/articles/article-routes";
import { getFlags } from "@/server/flags";

/** Online guides exist only while FEATURE_ONLINE is on; otherwise a plain 404 (D-019). */
export const revalidate = 600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/online/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("online", slug);
}

export default async function OnlineGuidePage({ params }: PageProps<"/online/[slug]">) {
  if (!(await getFlags()).FEATURE_ONLINE) notFound();
  const { slug } = await params;
  return <ArticleRoute type="online" slug={slug} />;
}
