import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/clips/top/[week]">): Promise<Metadata> {
  const { week } = await params;
  return buildMetadata({
    title: `Top 10 clips · ${decodeURIComponent(week)}`,
    section: "Clips",
    path: `/clips/top/${encodeURIComponent(week)}`,
    noindex: true,
  });
}

export default async function TopClipsWeekPage({ params }: PageProps<"/clips/top/[week]">) {
  const { week } = await params;
  return (
    <StubPage
      eyebrow="Clips"
      title={`Top 10 clips · ${decodeURIComponent(week)}`}
      icon={Trophy}
      emptyTitle="This week's top 10 isn't ready"
      emptyDescription="The weekly top 10 is frozen every Monday at 06:00 UTC for the week before."
      links={[{ href: "/clips", label: "Browse clips", primary: true }]}
    />
  );
}
