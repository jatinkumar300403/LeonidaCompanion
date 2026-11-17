import type { Metadata } from "next";
import { Clapperboard } from "lucide-react";
import { StubPage } from "@/components/shared/stub-page";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/clips/[id]">): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({ title: `Clip ${id}`, section: "Clips", path: routes.clip(Number(id)), noindex: true });
}

export default async function ClipPage({ params }: PageProps<"/clips/[id]">) {
  const { id } = await params;
  return (
    <StubPage
      eyebrow="Clips"
      title={`Clip ${id}`}
      icon={Clapperboard}
      emptyTitle="This clip isn't available"
      emptyDescription="It may not be approved yet, or the creator asked us to remove it."
      links={[{ href: "/clips", label: "Browse clips", primary: true }]}
    />
  );
}
