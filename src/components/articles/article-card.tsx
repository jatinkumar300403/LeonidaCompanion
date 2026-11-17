import { articlePath } from "@/config/articles";
import { FactCard } from "@/components/articles/fact-card";
import { FeatureCard } from "@/components/articles/feature-card";
import { TipCard } from "@/components/articles/tip-card";
import { toFactSummary, toFeatureSummary, toTipSummary, type ArticleListItem } from "@/lib/articles/view";

/** The right card for an article's type (tips, online guides → TipCard). Safe in client components. */
export function ArticleCard({ item, className }: { item: ArticleListItem; className?: string }) {
  switch (item.type) {
    case "feature":
      return <FeatureCard feature={toFeatureSummary(item)} className={className} />;
    case "fact":
      return <FactCard fact={toFactSummary(item)} className={className} />;
    default:
      return <TipCard tip={toTipSummary(item)} href={articleHref(item)} className={className} />;
  }
}

function articleHref(item: ArticleListItem) {
  return item.type === "online" ? (articlePath("online", item.slug) ?? undefined) : undefined;
}
