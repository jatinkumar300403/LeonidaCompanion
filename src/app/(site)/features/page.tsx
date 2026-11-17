import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { IndexRoute, indexMetadata, type IndexCopy } from "@/components/articles/article-routes";

const copy: IndexCopy = {
  type: "feature",
  basePath: "/features",
  eyebrow: "Features Explained",
  title: "GTA 6 features explained",
  metaTitle: "GTA 6 Features Explained",
  description: "How the game's systems work, and what isn't confirmed yet.",
  metaDescription: "How GTA 6's systems work, explained in plain English, with what is and isn't confirmed.",
  icon: BookOpen,
  emptyTitle: "Explainers are on the way",
  emptyDescription: "Each one covers what a mechanic is, how it works and what isn't confirmed yet.",
};

export async function generateMetadata({ searchParams }: PageProps<"/features">): Promise<Metadata> {
  return indexMetadata(copy, searchParams);
}

export default function FeaturesPage({ searchParams }: PageProps<"/features">) {
  return <IndexRoute copy={copy} searchParams={searchParams} />;
}
