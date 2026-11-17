import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { CountdownOrStatus } from "@/components/shared/countdown-or-status";
import { StubPage } from "@/components/shared/stub-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLaunchHint } from "@/server/launch";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Launch Hub",
    path: "/launch",
    description: "GTA 6 release date, platforms, editions and preload info, each with its source.",
  });
}

export default async function LaunchPage() {
  const launchHint = await getLaunchHint();

  return (
    <StubPage
      eyebrow="Launch Hub"
      title="GTA 6 Launch Hub"
      description="Release date, platforms, editions, preload and the first things to do, each with a source."
      icon={Rocket}
      emptyTitle="Launch details are being checked"
      emptyDescription="Every item here links to an official source. We add them as soon as they're verified."
      links={[
        { href: "/tips", label: "Browse tips", primary: true },
        { href: "/ask", label: "Ask AI" },
      ]}
    >
      <CountdownOrStatus serverHint={launchHint} />
    </StubPage>
  );
}
