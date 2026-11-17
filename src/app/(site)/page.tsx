import type { Metadata } from "next";
import { HomeHero } from "@/components/home/home-hero";
import {
  ClipOfTheDay,
  FactsStrip,
  FeaturesGrid,
  LatestTips,
  NewsletterCta,
  OnlineTeaser,
  TrendingThreads,
} from "@/components/home/home-sections";
import { JsonLd } from "@/components/shared/json-ld";
import { siteConfig } from "@/config/site";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { getFlags } from "@/server/flags";
import { getHomeData } from "@/server/home/get-home-data";
import { getLaunchHint } from "@/server/launch";
import { isNewsletterEnabled } from "@/server/newsletter/status";

/** SPEC §1: home is ISR with a 60 s window. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: `${siteConfig.name} – ${siteConfig.tagline}` },
    description: siteConfig.description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [data, flags, launchHint] = await Promise.all([getHomeData(), getFlags(), getLaunchHint()]);
  const signupsEnabled = isNewsletterEnabled();

  return (
    <>
      <JsonLd data={websiteJsonLd({ name: siteConfig.name, url: siteConfig.url })} />
      <HomeHero launchHint={launchHint} />
      <div className="page-container flex flex-col gap-14 py-12 sm:gap-16 sm:py-16">
        <LatestTips tips={data.tips} />
        <div className="grid gap-14 sm:gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
          <TrendingThreads threads={data.threads} />
          <ClipOfTheDay clip={data.clipOfTheDay} />
        </div>
        <FeaturesGrid features={data.features} />
        <FactsStrip facts={data.facts} />
        <OnlineTeaser onlineEnabled={flags.FEATURE_ONLINE} signupsEnabled={signupsEnabled} />
        <NewsletterCta signupsEnabled={signupsEnabled} />
      </div>
    </>
  );
}
