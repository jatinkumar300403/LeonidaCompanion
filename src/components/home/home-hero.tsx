import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AskBox } from "@/components/ask/ask-box";
import { CountdownOrStatus } from "@/components/shared/countdown-or-status";
import { DuskGlow, PalmSilhouette, SunsetDisc } from "@/components/shared/motifs";
import { Button } from "@/components/ui/button";
import { SUGGESTED_QUESTIONS } from "@/config/site";

/**
 * Block 1 (SPEC §3): headline, countdown/status, the big AskBox with 4 suggestions, CTAs.
 * The gradient sits on "unofficial guide", never on "GTA VI" (rule 2: nothing logo-like).
 */
export function HomeHero({
  launchHint,
  launchAt,
}: {
  launchHint: "upcoming" | "out" | "unknown";
  /** An official instant from launch_facts, or LAUNCH_AT (D-020). */
  launchAt?: string;
}) {
  return (
    <section aria-labelledby="hero-title" className="grain relative overflow-hidden border-b bg-background">
      <DuskGlow />
      <HeroArt />
      <div className="relative page-container py-10 sm:py-16 lg:py-20">
        <div className="max-w-3xl lg:max-w-[40rem] xl:max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">Unofficial fan guide · Launch week</p>
          <h1
            id="hero-title"
            className="mt-3 text-[2.5rem] leading-[1.05] font-bold sm:text-5xl lg:text-[4rem] lg:leading-[1.02]"
          >
            Your <span className="text-dusk">unofficial guide</span> to GTA VI
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Straight answers, tips that work, explained features and sourced facts, plus a help forum for when
            you&apos;re stuck.
          </p>
          <CountdownOrStatus className="mt-6" serverHint={launchHint} launchAt={launchAt} />
          <AskBox className="mt-8" suggestions={SUGGESTED_QUESTIONS} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/tips">
                Browse tips
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/forum">Join the forum</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Original sunset + palm illustration, decorative, wide screens only. */
function HeroArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-[4%] hidden aspect-square w-[min(36vw,30rem)] -translate-y-1/2 lg:block xl:right-[7%]"
    >
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,var(--glow-pink),transparent_70%)] blur-2xl" />
      <SunsetDisc className="absolute inset-0 size-full opacity-90" />
      <PalmSilhouette className="absolute right-[2%] -bottom-[8%] h-[92%] text-[#0a0b10]" />
    </div>
  );
}
