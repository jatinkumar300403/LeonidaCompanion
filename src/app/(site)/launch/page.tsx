import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Download, ExternalLink, Gamepad2, HardDrive, Package, Rocket } from "lucide-react";
import { JsonLd } from "@/components/shared/json-ld";
import { CountdownOrStatus } from "@/components/shared/countdown-or-status";
import { PageHeader } from "@/components/shared/headers";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { hostnameOf } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { ogImagePath } from "@/lib/seo/og";
import { hasLaunchFacts, type LaunchFacts } from "@/lib/validation/launch-facts";
import { getLaunchArticle } from "@/server/articles/queries";
import { getLaunchAt, getLaunchFacts, getLaunchHint } from "@/server/launch";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "GTA 6 Launch Hub",
    path: "/launch",
    description: "GTA 6 release date, platforms, editions and preload info, each with its source.",
    image: ogImagePath("GTA 6 Launch Hub", "Launch"),
  });
}

const releaseFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function Source({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      rel="noopener noreferrer nofollow"
      target="_blank"
      className="relative z-10 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      Source: {hostnameOf(url) ?? "link"}
      <ExternalLink className="size-3" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function FactBlock({ icon: Icon, title, children }: { icon: typeof Rocket; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="size-4 text-orange-text" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-sm">{children}</div>
    </Card>
  );
}

function LaunchFactsGrid({ facts }: { facts: LaunchFacts }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {facts.release_at ? (
        <FactBlock icon={CalendarClock} title="Release">
          <p className="text-base font-medium">{releaseFormat.format(new Date(facts.release_at))}</p>
          {facts.release_note ? <p className="text-muted-foreground">{facts.release_note}</p> : null}
          <Source url={facts.release_source_url} />
        </FactBlock>
      ) : null}
      {facts.platforms.length > 0 ? (
        <FactBlock icon={Gamepad2} title="Platforms">
          <ul className="flex flex-col gap-2">
            {facts.platforms.map((platform) => (
              <li key={platform.name} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{platform.name}</span>
                <Source url={platform.source_url} />
              </li>
            ))}
          </ul>
        </FactBlock>
      ) : null}
      {facts.editions.length > 0 ? (
        <FactBlock icon={Package} title="Editions">
          <ul className="flex flex-col gap-3">
            {facts.editions.map((edition) => (
              <li key={edition.name} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{edition.name}</span>
                  <span className="font-mono tabular-nums">{edition.price}</span>
                </div>
                {edition.contents ? <p className="text-muted-foreground">{edition.contents}</p> : null}
                <Source url={edition.source_url} />
              </li>
            ))}
          </ul>
        </FactBlock>
      ) : null}
      {facts.preload ? (
        <FactBlock icon={Download} title="Preload">
          <p>{facts.preload.text}</p>
          {facts.preload.starts_at ? <p className="text-muted-foreground">Starts: {facts.preload.starts_at}</p> : null}
          <Source url={facts.preload.source_url} />
        </FactBlock>
      ) : null}
      {facts.download_size ? (
        <FactBlock icon={HardDrive} title="Download size">
          <p className="text-base font-medium">{facts.download_size.value}</p>
          <Source url={facts.download_size.source_url} />
        </FactBlock>
      ) : null}
    </div>
  );
}

/** Launch Hub (SPEC §4): countdown, the launch_facts blocks (each with a source) and the launch article. */
export default async function LaunchPage() {
  const [launchHint, launchAt, facts, article] = await Promise.all([
    getLaunchHint(),
    getLaunchAt(),
    getLaunchFacts(),
    getLaunchArticle(),
  ]);
  const hasFacts = hasLaunchFacts(facts);

  return (
    <div className="page-container py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: new URL("/", siteConfig.url).toString() },
          { name: "Launch Hub", url: new URL("/launch", siteConfig.url).toString() },
        ])}
      />
      <PageHeader
        eyebrow="Launch Hub"
        title="GTA 6 Launch Hub"
        description="Release date, platforms, editions, preload and the first things to do, each with a source."
      />
      <div className="mt-6">
        <CountdownOrStatus launchAt={launchAt} serverHint={launchHint} />
      </div>

      {hasFacts ? (
        <div className="mt-10">
          <LaunchFactsGrid facts={facts} />
        </div>
      ) : null}

      {article ? (
        <section aria-labelledby="launch-article" className="mt-12 max-w-[68ch]">
          <h2 id="launch-article" className="text-2xl font-semibold">
            {article.title}
          </h2>
          {article.summary ? <p className="mt-2 text-lg text-muted-foreground">{article.summary}</p> : null}
          <MarkdownRenderer source={article.bodyMd} youtube className="mt-6" />
        </section>
      ) : null}

      {!hasFacts && !article ? (
        <EmptyState
          className="mt-10"
          icon={Rocket}
          title="Launch details are being checked"
          description="Every item here links to an official source. We add them as soon as they're verified."
          actions={
            <>
              <Button asChild size="sm">
                <Link href="/tips">Browse tips</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/ask">Ask AI</Link>
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  );
}
