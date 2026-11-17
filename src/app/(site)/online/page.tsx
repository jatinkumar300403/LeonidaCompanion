import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { StubPage } from "@/components/shared/stub-page";
import { Card } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo/metadata";
import { isNewsletterEnabled } from "@/server/newsletter/status";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Online",
    path: "/online",
    description: "GTA 6 Online guides are coming soon. Join the waitlist to hear when the first ones go up.",
  });
}

export default function OnlinePage() {
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
