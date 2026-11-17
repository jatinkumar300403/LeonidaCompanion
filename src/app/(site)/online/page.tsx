import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { IndexRoute, indexMetadata, type IndexCopy } from "@/components/articles/article-routes";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { StubPage } from "@/components/shared/stub-page";
import { Card } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFlags } from "@/server/flags";
import { isNewsletterEnabled } from "@/server/newsletter/status";

/** Online (SPEC §1): "coming soon" + waitlist, or the guides index once FEATURE_ONLINE is on (D-019). */
const copy: IndexCopy = {
  type: "online",
  basePath: "/online",
  eyebrow: "Online",
  title: "GTA 6 Online guides",
  metaTitle: "GTA 6 Online Guides",
  description: "Fair-play guides for the online mode. No exploits, money glitches or mods.",
  metaDescription: "GTA 6 Online guides: fair-play tips for the online mode, with sources.",
  icon: Globe,
  emptyTitle: "The first Online guides are being written",
  emptyDescription: "We only publish what's officially detailed or tested. No exploits, glitches or mods.",
};

export async function generateMetadata({ searchParams }: PageProps<"/online">): Promise<Metadata> {
  if ((await getFlags()).FEATURE_ONLINE) return indexMetadata(copy, searchParams);
  return buildMetadata({
    title: "GTA 6 Online",
    path: "/online",
    description: "GTA 6 Online guides are coming soon. Join the waitlist to hear when the first ones go up.",
  });
}

export default async function OnlinePage({ searchParams }: PageProps<"/online">) {
  // Read the query first so the page is always request-rendered: the flag can flip it to the
  // guides index (which filters by ?tag=…) without a static page suddenly needing searchParams.
  const params = await searchParams;
  if ((await getFlags()).FEATURE_ONLINE) return <IndexRoute copy={copy} searchParams={Promise.resolve(params)} />;

  return (
    <StubPage
      eyebrow="Online · coming soon"
      title="GTA 6 Online"
      description="Guides arrive when Rockstar shares the details. Fair play only: no exploits, money glitches or mods."
      icon={Globe}
      emptyTitle="Online guides aren't here yet"
      emptyDescription="Nothing here is speculation. We start writing once the mode is officially detailed."
      links={[{ href: "/tips", label: "Browse story-mode tips", primary: true }]}
    >
      <Card variant="flat" className="max-w-xl p-5">
        <p className="text-sm font-semibold">Join the waitlist</p>
        <p className="mt-1 text-sm text-muted-foreground">One email when the first Online guides go up.</p>
        <NewsletterForm
          enabled={isNewsletterEnabled()}
          list="online_waitlist"
          submitLabel="Join waitlist"
          className="mt-3"
        />
      </Card>
    </StubPage>
  );
}
