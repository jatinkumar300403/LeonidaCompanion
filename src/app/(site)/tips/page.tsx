import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { IndexRoute, indexMetadata, type IndexCopy } from "@/components/articles/article-routes";

const copy: IndexCopy = {
  type: "tip",
  basePath: "/tips",
  eyebrow: "Tips & Tricks",
  title: "GTA 6 tips & tricks",
  metaTitle: "GTA 6 Tips & Tricks",
  description: "Short, tested answers. Spoiler-free unless marked.",
  metaDescription: "Quick, tested GTA 6 tips for money, wanted levels, driving, settings and more.",
  icon: Lightbulb,
  emptyTitle: "The first tips land at launch",
  emptyDescription: "We publish quick tips as players discover things. Until then, ask a question or browse the forum.",
};

export async function generateMetadata({ searchParams }: PageProps<"/tips">): Promise<Metadata> {
  return indexMetadata(copy, searchParams);
}

export default function TipsPage({ searchParams }: PageProps<"/tips">) {
  return <IndexRoute copy={copy} searchParams={searchParams} />;
}
