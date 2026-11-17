import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, Lightbulb, Plus, Sparkles } from "lucide-react";
import { AvatarDemos, OverlayDemos, TabsDemo } from "@/components/admin/showcase-demos";
import { FactCard } from "@/components/articles/fact-card";
import { FeatureCard } from "@/components/articles/feature-card";
import { StatusBadge } from "@/components/articles/status-badge";
import { TipCard } from "@/components/articles/tip-card";
import { AnswerCard } from "@/components/ask/answer-card";
import { AskBox } from "@/components/ask/ask-box";
import { ClipCard } from "@/components/clips/clip-card";
import { ClipEmbed } from "@/components/clips/clip-embed";
import { ThreadRow } from "@/components/forum/thread-row";
import { VoteButtons } from "@/components/forum/vote-buttons";
import {
  ClipOfTheDay,
  FactsStrip,
  FeaturesGrid,
  LatestTips,
  NewsletterCta,
  OnlineTeaser,
  TrendingThreads,
} from "@/components/home/home-sections";
import { LogoMark } from "@/components/layout/logo";
import { CountdownOrStatus } from "@/components/shared/countdown-or-status";
import { PageHeader, SectionHeader } from "@/components/shared/headers";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { PalmSilhouette } from "@/components/shared/motifs";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import {
  ClipCardSkeleton,
  FactCardSkeleton,
  FeatureCardSkeleton,
  ThreadRowSkeleton,
  TipCardSkeleton,
} from "@/components/shared/skeletons";
import { InlineSpoiler, SpoilerBlock } from "@/components/shared/spoiler";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig, SUGGESTED_QUESTIONS } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { SAMPLE_CLIPS, SAMPLE_FACTS, SAMPLE_FEATURES, SAMPLE_THREADS, SAMPLE_TIPS } from "@/server/mock/data";
import type { AnswerSource } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "UI showcase", path: "/admin/ui", noindex: true });
}

const SECTIONS = [
  ["foundations", "Foundations"],
  ["buttons", "Buttons"],
  ["badges", "Badges"],
  ["cards", "Cards"],
  ["forms", "Forms"],
  ["overlays", "Overlays & navigation"],
  ["content", "Content cards"],
  ["forum", "Forum"],
  ["clips", "Clips"],
  ["ai", "Ask AI"],
  ["markdown", "Markdown"],
  ["states", "States"],
  ["home-empty", "Home blocks, empty"],
] as const;

const SWATCHES = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["border", "bg-border"],
  ["foreground", "bg-foreground"],
  ["muted-foreground", "bg-muted-foreground"],
  ["pink", "bg-pink"],
  ["orange", "bg-orange"],
  ["teal", "bg-teal"],
  ["violet", "bg-violet"],
  ["dusk", "bg-dusk"],
  ["input", "bg-input"],
] as const;

const TEXT_TOKENS = [
  ["pink-text", "text-pink-text"],
  ["orange-text", "text-orange-text"],
  ["teal-text", "text-teal-text"],
  ["violet-text", "text-violet-text"],
  ["muted-foreground", "text-muted-foreground"],
  ["destructive", "text-destructive"],
] as const;

const TYPE_SCALE = [
  ["text-5xl · 64", "text-5xl font-display font-bold"],
  ["text-4xl · 48", "text-4xl font-display font-bold"],
  ["text-3xl · 36", "text-3xl font-display font-semibold"],
  ["text-2xl · 28", "text-2xl font-display font-semibold"],
  ["text-xl · 22", "text-xl font-display font-semibold"],
  ["text-lg · 18", "text-lg"],
  ["text-base · 16", "text-base"],
  ["text-sm · 14", "text-sm"],
] as const;

const MARKDOWN_SAMPLE = `## Getting started

A paragraph with **bold**, *italic*, a [link to the tips](/tips), an [external link](https://example.com) and \`inline code\`.

> [!TIP]
> Tip callout: GitHub alert syntax works.

> [!NOTE]
> Note callout.

> [!IMPORTANT]
> Important callout.

> [!WARNING]
> Warning callout.

> [!CAUTION]
> Caution callout.

### Lists

1. Numbered step one
2. Step two hides a detail: ||the inline spoiler stays blurred until revealed||
3. Step three

- A bullet
- Another bullet

||This whole paragraph is a block spoiler. It stays hidden until you choose to reveal it.||

### A table

| Sample setting | Sample value |
|---|---|
| Subtitles | On |
| Camera shake | Low |

> A plain quote looks like this.

Raw HTML and unsafe links are dropped: <script>alert("xss")</script> [unsafe link](javascript:alert(1))
`;

const SAMPLE_SOURCES: AnswerSource[] = [
  {
    n: 1,
    title: "[SAMPLE] Official announcement",
    url: "https://example.com/announcement",
    sourceName: "example.com",
  },
  {
    n: 2,
    title: "[SAMPLE] Wiki page",
    url: "https://example.org/wiki/page",
    sourceName: "Sample Wiki",
    license: "CC BY-SA 3.0",
    attribution: "Text from Sample Wiki, CC BY-SA 3.0. Authors listed in the page history.",
  },
];

const SAMPLE_ANSWER = `This sample answer shows the layout: a direct answer first [1], with every factual sentence citing a numbered source [2].

- A short detail with its source [1]
- Another detail [2]`;

function ShowcaseSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 border-t pt-10">
      <h2 id={id} className="text-2xl font-semibold">
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  );
}

function Demo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </h3>
      {children}
    </div>
  );
}

export default function UiShowcasePage() {
  const [twitchClip, youtubeClip, tiktokClip] = SAMPLE_CLIPS;

  return (
    <div className="page-container flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader
        eyebrow="Admin · dev only"
        title="UI showcase"
        description={`Every ${siteConfig.name} component in every state. Toggle the theme to check both. Visual QA lives here.`}
      />

      <nav aria-label="Showcase sections">
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex h-8 items-center rounded-full border px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ShowcaseSection id="foundations" title="Foundations">
        <Demo label="Colour tokens">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {SWATCHES.map(([name, className]) => (
              <li key={name} className="overflow-hidden rounded-xl border bg-card">
                <div className={`h-14 ${className}`} />
                <p className="px-3 py-2 font-mono text-xs">--{name}</p>
              </li>
            ))}
          </ul>
        </Demo>
        <Demo label="Accent text tokens (AA in both themes)">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {TEXT_TOKENS.map(([name, className]) => (
              <li key={name} className={`text-sm font-semibold ${className}`}>
                --{name}
              </li>
            ))}
          </ul>
        </Demo>
        <Demo label="Type scale (Bricolage Grotesque, Inter, JetBrains Mono)">
          <ul className="flex flex-col gap-2">
            {TYPE_SCALE.map(([label, className]) => (
              <li key={label} className="flex items-baseline gap-4">
                <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{label}</span>
                <span className={`${className} truncate`}>Leonida at dusk</span>
              </li>
            ))}
            <li className="flex items-baseline gap-4">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">mono · numbers</span>
              <span className="font-mono text-lg tabular-nums">01:23:45 · 1,284 · 0:24</span>
            </li>
          </ul>
        </Demo>
        <Demo label="Gradient, motifs and logo mark">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <div className="h-10 rounded-lg bg-dusk" />
              <p className="text-2xl font-bold">
                <span className="text-dusk">Gradient text</span> for emphasis
              </p>
              <a href="#foundations" className="w-fit link-dusk text-sm font-medium">
                Gradient underline on hover
              </a>
            </div>
            <div className="grain relative flex min-h-36 items-end overflow-hidden rounded-xl border bg-surface-2 p-5">
              <PalmSilhouette className="absolute right-2 bottom-0 h-40 text-foreground opacity-[var(--palm-opacity)]" />
              <p className="text-sm text-muted-foreground">Film grain + palm silhouette, used sparingly</p>
            </div>
            <div className="flex items-end gap-4 rounded-xl border bg-card p-5">
              <LogoMark className="size-4" />
              <LogoMark className="size-6" />
              <LogoMark className="size-8" />
              <LogoMark className="size-12" />
              <LogoMark className="size-24" title={`${siteConfig.name} logo`} />
            </div>
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="buttons" title="Buttons">
        <Demo label="Variants">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </Demo>
        <Demo label="Sizes, icons, disabled, as link">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">
              <Sparkles aria-hidden="true" />
              Large with icon
            </Button>
            <Button size="icon" aria-label="Add">
              <Plus aria-hidden="true" />
            </Button>
            <Button size="icon" variant="secondary" aria-label="Add">
              <Plus aria-hidden="true" />
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
            <Button asChild variant="outline">
              <Link href="/tips">
                Link button
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="badges" title="Badges">
        <Demo label="Variants">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="tag">Tag</Badge>
            <Badge variant="pink">Pink</Badge>
            <Badge variant="orange">Orange</Badge>
            <Badge variant="teal">Teal</Badge>
            <Badge variant="violet">Violet</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="violet" size="sm">
              Soon
            </Badge>
          </div>
        </Demo>
        <Demo label="StatusBadge (with and without tooltip)">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="confirmed" />
            <StatusBadge status="verified" />
            <StatusBadge status="community" />
            <StatusBadge status="confirmed" withTooltip />
            <StatusBadge status="verified" withTooltip />
            <StatusBadge status="community" withTooltip />
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="cards" title="Cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Border + glow (dark), soft shadow (light)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Card body.</CardContent>
            <CardFooter className="text-xs text-muted-foreground">Footer</CardFooter>
          </Card>
          <Card accent>
            <CardHeader>
              <CardTitle>Accent</CardTitle>
              <CardDescription>Thin dusk top border</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Card body.</CardContent>
          </Card>
          <Card interactive accent>
            <CardHeader>
              <CardTitle>
                <a href="#cards" className="after:absolute after:inset-0 focus-visible:outline-none">
                  Interactive
                </a>
              </CardTitle>
              <CardDescription>Hover lift, focus ring on the card</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Whole card is the link.</CardContent>
          </Card>
          <Card variant="flat">
            <CardHeader>
              <CardTitle>Flat</CardTitle>
              <CardDescription>Surface-2, no shadow</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Card body.</CardContent>
          </Card>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="forms" title="Forms">
        <div className="grid gap-8 lg:grid-cols-2">
          <Demo label="Inputs">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-default">Default</Label>
                <Input id="demo-default" placeholder="Type something…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-invalid">Invalid</Label>
                <Input
                  id="demo-invalid"
                  aria-invalid
                  defaultValue="not-an-email"
                  aria-describedby="demo-invalid-error"
                />
                <p id="demo-invalid-error" className="text-xs text-destructive">
                  Enter a valid email address.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-disabled">Disabled</Label>
                <Input id="demo-disabled" disabled placeholder="Disabled" />
              </div>
            </div>
          </Demo>
          <Demo label="Newsletter form: enabled / disabled (Phase 1)">
            <div className="flex flex-col gap-6">
              <NewsletterForm enabled />
              <NewsletterForm enabled={false} />
            </div>
          </Demo>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="overlays" title="Overlays & navigation">
        <Demo label="Dialog, sheets, dropdown, tooltip, toasts, theme">
          <OverlayDemos />
        </Demo>
        <Demo label="Tabs (sliding underline)">
          <TabsDemo />
        </Demo>
        <Demo label="Avatars">
          <AvatarDemos />
        </Demo>
        <Demo label="Section header">
          <SectionHeader title="Latest tips" description="Optional description line." href="/tips" />
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="content" title="Content cards">
        <Demo label="TipCard: spoiler-free · minor spoilers · long title">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TipCard tip={SAMPLE_TIPS[0]} />
            <TipCard tip={SAMPLE_TIPS[4]} />
            <TipCard tip={SAMPLE_TIPS[3]} />
          </div>
        </Demo>
        <Demo label="FeatureCard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_FEATURES.slice(0, 3).map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </Demo>
        <Demo label="FactCard: confirmed · verified · community (no source)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_FACTS.slice(0, 3).map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="forum" title="Forum">
        <Demo label="ThreadRow: solved · open · spoiler · locked">
          <Card>
            <ol className="divide-y">
              {SAMPLE_THREADS.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow thread={thread} />
                </li>
              ))}
            </ol>
          </Card>
        </Demo>
        <Demo label="VoteButtons: neutral · upvoted · downvoted · horizontal">
          <div className="flex flex-wrap items-center gap-8">
            <VoteButtons initialScore={12} label="thread" />
            <VoteButtons initialScore={13} initialVote={1} label="thread" />
            <VoteButtons initialScore={11} initialVote={-1} label="thread" />
            <VoteButtons initialScore={1284} orientation="horizontal" label="clip" />
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="clips" title="Clips">
        <div className="grid gap-6 lg:grid-cols-3">
          <Demo label="Twitch · idle (facade)">
            <ClipCard clip={twitchClip} />
          </Demo>
          <Demo label="YouTube · first-play notice">
            <ClipCard clip={youtubeClip} initialStage="consent" />
          </Demo>
          <Demo label="TikTok · loaded (opens on TikTok until Phase 5)">
            <ClipCard clip={tiktokClip} initialStage="playing" />
          </Demo>
        </div>
        <Demo label="Portrait embed (Shorts / TikTok), idle">
          <div className="max-w-xs">
            <ClipEmbed clip={tiktokClip} parentHosts={siteConfig.hosts} />
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="ai" title="Ask AI">
        <Demo label="AskBox · large with suggestions">
          <AskBox suggestions={SUGGESTED_QUESTIONS} />
        </Demo>
        <Demo label="AskBox · medium, prefilled">
          <AskBox size="md" defaultValue="How do I lose a wanted level fast?" className="max-w-xl" />
        </Demo>
        <Demo label="AnswerCard (static)">
          <div className="max-w-3xl">
            <AnswerCard
              question="[SAMPLE] What time does the game unlock?"
              answer={SAMPLE_ANSWER}
              sources={SAMPLE_SOURCES}
            />
          </div>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="markdown" title="Markdown">
        <Demo label="MarkdownRenderer: headings with anchors, callouts, spoilers, table, sanitising">
          <Card className="p-5 sm:p-8">
            <MarkdownRenderer source={MARKDOWN_SAMPLE} />
          </Card>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="states" title="States">
        <Demo label="CountdownOrStatus: live · fixed upcoming · out now">
          <div className="flex flex-col gap-4">
            <CountdownOrStatus />
            <CountdownOrStatus launchAt="2026-11-19T00:00:00Z" fixedNow={Date.parse("2026-11-17T19:47:51Z")} />
            <CountdownOrStatus launchAt="2026-11-19T00:00:00Z" fixedNow={Date.parse("2026-11-20T00:00:00Z")} />
          </div>
        </Demo>
        <Demo label="Spoilers: inline and block">
          <div className="flex flex-col gap-4 text-base">
            <p>
              The twist is <InlineSpoiler>a sample inline spoiler</InlineSpoiler>, and the rest of the sentence stays
              readable.
            </p>
            <SpoilerBlock>
              <p>A sample block spoiler. It stays blurred, hidden from screen readers and inert until revealed.</p>
            </SpoilerBlock>
          </div>
        </Demo>
        <div className="grid gap-6 lg:grid-cols-2">
          <Demo label="EmptyState">
            <EmptyState
              as="h3"
              icon={Lightbulb}
              title="The first tips land at launch"
              description="Real empty states say what will appear and offer something to do meanwhile."
              actions={
                <Button size="sm" asChild>
                  <Link href="/ask">Ask AI</Link>
                </Button>
              }
            />
          </Demo>
          <Demo label="EmptyState · compact">
            <EmptyState compact as="h3" icon={Inbox} title="No notifications" description="You're all caught up." />
          </Demo>
        </div>
        <Demo label="ErrorState">
          <ErrorState as="h3" actions={<Button size="sm">Try again</Button>} />
        </Demo>
        <Demo label="Skeletons">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TipCardSkeleton />
            <FeatureCardSkeleton />
            <FactCardSkeleton />
            <ClipCardSkeleton />
          </div>
          <Card className="mt-4">
            <ThreadRowSkeleton />
            <ThreadRowSkeleton className="border-t" />
          </Card>
        </Demo>
      </ShowcaseSection>

      <ShowcaseSection id="home-empty" title="Home blocks, empty">
        <LatestTips tips={[]} />
        <div className="grid gap-10 lg:grid-cols-2">
          <TrendingThreads threads={[]} />
          <ClipOfTheDay clip={null} />
        </div>
        <FeaturesGrid features={[]} />
        <FactsStrip facts={[]} />
        <OnlineTeaser onlineEnabled={false} signupsEnabled={false} />
        <OnlineTeaser onlineEnabled signupsEnabled={false} />
        <NewsletterCta signupsEnabled={false} />
      </ShowcaseSection>
    </div>
  );
}
