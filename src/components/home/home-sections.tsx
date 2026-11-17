import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Clapperboard,
  Globe,
  Lightbulb,
  Mail,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { FactCard } from "@/components/articles/fact-card";
import { FeatureCard } from "@/components/articles/feature-card";
import { TipCard } from "@/components/articles/tip-card";
import { ClipCard } from "@/components/clips/clip-card";
import { ThreadRow } from "@/components/forum/thread-row";
import { SectionHeader } from "@/components/shared/headers";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import type { ClipSummary, FactSummary, FeatureSummary, ThreadSummary, TipSummary } from "@/types/content";

/** Home blocks 2–8 (SPEC §3). Each takes its data and shows a real empty state without it. */

function Section({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={className}>
      {children}
    </section>
  );
}

export function LatestTips({ tips }: { tips: TipSummary[] }) {
  return (
    <Section id="latest-tips">
      <SectionHeader id="latest-tips" title="Latest tips" href="/tips" linkLabel="All tips" />
      {tips.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.slice(0, 6).map((tip) => (
            <li key={tip.id} className="flex">
              <TipCard tip={tip} className="w-full" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-5"
          as="h3"
          icon={Lightbulb}
          title="The first tips land at launch"
          description="We publish quick, tested tips as players find them. Until then, ask a question or browse the forum."
          actions={
            <>
              <Button asChild size="sm">
                <Link href="/ask">
                  <Sparkles aria-hidden="true" />
                  Ask AI
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/forum">Visit the forum</Link>
              </Button>
            </>
          }
        />
      )}
    </Section>
  );
}

export function TrendingThreads({ threads }: { threads: ThreadSummary[] }) {
  return (
    <Section id="trending-threads">
      <SectionHeader id="trending-threads" title="Trending in the forum" href="/forum" linkLabel="Forum" />
      {threads.length > 0 ? (
        <Card className="mt-5">
          <ol className="divide-y">
            {threads.slice(0, 5).map((thread) => (
              <li key={thread.id}>
                <ThreadRow thread={thread} />
              </li>
            ))}
          </ol>
          <div className="border-t px-4 py-3">
            <Link
              href={routes.unanswered()}
              className="inline-flex items-center gap-1 link-dusk text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Unanswered questions
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      ) : (
        <EmptyState
          className="mt-5"
          as="h3"
          icon={MessagesSquare}
          title="The forum opens at launch"
          description="Stuck on something? Ask the community and get an answer from players who've been there."
          actions={
            <Button asChild size="sm" variant="secondary">
              <Link href="/forum/new">Start a thread</Link>
            </Button>
          }
        />
      )}
    </Section>
  );
}

export function ClipOfTheDay({ clip }: { clip: ClipSummary | null }) {
  return (
    <Section id="clip-of-the-day">
      <SectionHeader id="clip-of-the-day" title="Clip of the day" href="/clips" linkLabel="More clips" />
      {clip ? (
        <ClipCard clip={clip} className="mt-5" />
      ) : (
        <EmptyState
          className="mt-5"
          as="h3"
          icon={Clapperboard}
          title="Clips arrive with launch"
          description="The funniest and most epic moments from streamers, shown through official Twitch, YouTube and TikTok embeds."
          actions={
            <Button asChild size="sm" variant="secondary">
              <Link href="/clips/submit">Submit a clip</Link>
            </Button>
          }
        />
      )}
    </Section>
  );
}

export function FeaturesGrid({ features }: { features: FeatureSummary[] }) {
  return (
    <Section id="features-explained">
      <SectionHeader
        id="features-explained"
        title="Features explained"
        description="How the game's systems work, in plain English."
        href="/features"
        linkLabel="All features"
      />
      {features.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.slice(0, 6).map((feature) => (
            <li key={feature.id} className="flex">
              <FeatureCard feature={feature} className="w-full" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-5"
          as="h3"
          icon={BookOpen}
          title="Explainers are on the way"
          description="Each one covers what a mechanic is, how it works and what isn't confirmed yet."
        />
      )}
    </Section>
  );
}

export function FactsStrip({ facts }: { facts: FactSummary[] }) {
  return (
    <Section id="facts">
      <SectionHeader
        id="facts"
        title="Facts"
        description="Every fact carries a status: confirmed, verified or community."
        href="/facts"
        linkLabel="All facts"
      />
      {facts.length > 0 ? (
        <div
          role="region"
          aria-label="Facts, scroll sideways for more"
          tabIndex={0}
          className="-mx-4 mt-5 no-scrollbar scroll-fade-x overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        >
          <ul className="flex snap-x snap-mandatory gap-4 pb-2">
            {facts.map((fact) => (
              <li key={fact.id} className="flex w-[17.5rem] shrink-0 snap-start sm:w-80">
                <FactCard fact={fact} className="w-full" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          as="h3"
          icon={BadgeCheck}
          title="No facts published yet"
          description="Facts only go up with a source. Rumours never do."
        />
      )}
    </Section>
  );
}

export function OnlineTeaser({ onlineEnabled, signupsEnabled }: { onlineEnabled: boolean; signupsEnabled: boolean }) {
  if (onlineEnabled) {
    return (
      <Section id="online-guides">
        <SectionHeader id="online-guides" title="Online guides" href="/online" linkLabel="All Online guides" />
        <EmptyState
          className="mt-5"
          as="h3"
          icon={Globe}
          title="Online guides are being written"
          description="Fair-play guides only: no exploits, money glitches or mods."
        />
      </Section>
    );
  }

  return (
    <Section id="online-teaser">
      <Card variant="flat" className="grain overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-text">
              <Globe className="size-4" aria-hidden="true" />
              Online · coming soon
            </p>
            <h2 id="online-teaser" className="mt-2 text-xl font-semibold sm:text-2xl">
              Online guides arrive when Rockstar shares the details
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Join the waitlist and we&apos;ll email you once when the first fair-play guides go up.
            </p>
          </div>
          <NewsletterForm enabled={signupsEnabled} list="online_waitlist" submitLabel="Join waitlist" />
        </div>
      </Card>
    </Section>
  );
}

export function NewsletterCta({ signupsEnabled }: { signupsEnabled: boolean }) {
  return (
    <Section id="newsletter">
      <Card accent className="p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-pink-text">
              <Mail className="size-4" aria-hidden="true" />
              The weekly digest
            </p>
            <h2 id="newsletter" className="mt-2 text-xl font-semibold sm:text-2xl">
              The week&apos;s best tips, threads and clips
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              One email every Monday. Unsubscribe in one click.
            </p>
          </div>
          <NewsletterForm enabled={signupsEnabled} />
        </div>
      </Card>
    </Section>
  );
}
