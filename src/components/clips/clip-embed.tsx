"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PalmSilhouette } from "@/components/shared/motifs";
import { buildEmbedSrc, PLATFORM_LABELS, twitchParentHosts } from "@/lib/clips/embed";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClipSummary } from "@/types/content";

/**
 * Click-to-load facade (SPEC §6, CLAUDE.md rule 1). Nothing from the platform loads until the
 * visitor presses play. On the first ever play we explain that the embed may set cookies and
 * remember the answer in localStorage (wrapped in try/catch: storage can be blocked).
 * Only official embeds are used: YouTube nocookie, Twitch clips with every `parent` host.
 */

const CONSENT_KEY = "la:embed-consent";

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberConsent() {
  try {
    window.localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    // Storage blocked (private mode, settings): ask again next time.
  }
}

type Stage = "idle" | "consent" | "playing";

export function ClipEmbed({
  clip,
  parentHosts,
  initialStage = "idle",
  priority = false,
  className,
}: {
  clip: ClipSummary;
  /** NEXT_PUBLIC_SITE_HOSTS (passed from the server). */
  parentHosts: readonly string[];
  /** Showcase only: start in a given state. */
  initialStage?: Stage;
  priority?: boolean;
  className?: string;
}) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const loadButtonRef = useRef<HTMLButtonElement>(null);
  const platform = PLATFORM_LABELS[clip.platform];
  const portrait = clip.orientation === "portrait";

  function play() {
    if (hasConsent()) {
      setStage("playing");
      return;
    }
    setStage("consent");
    // Move focus into the notice only after a user action (never on page load).
    requestAnimationFrame(() => loadButtonRef.current?.focus());
  }

  function accept() {
    rememberConsent();
    setStage("playing");
  }

  function decline() {
    setStage("idle");
    requestAnimationFrame(() => playButtonRef.current?.focus());
  }

  const currentHost = typeof window === "undefined" ? undefined : window.location.hostname;
  const src =
    stage === "playing"
      ? buildEmbedSrc(clip.platform, clip.embedId, twitchParentHosts(parentHosts, currentHost))
      : null;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border bg-surface-2",
        portrait ? "mx-auto aspect-[9/16] h-[min(70dvh,32rem)] max-w-full" : "aspect-video w-full",
        className,
      )}
    >
      {stage === "playing" ? (
        src ? (
          <iframe
            src={src}
            title={`${clip.title} (${platform} video)`}
            className="absolute inset-0 size-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                This {platform} clip opens on {platform}.
              </p>
              <Button asChild size="sm" variant="secondary" className="mt-3">
                <a href={clip.url} rel="noopener noreferrer" target="_blank">
                  Watch on {platform}
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        )
      ) : (
        <>
          {clip.thumbnailUrl ? (
            <Image
              src={clip.thumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              priority={priority}
              className="object-cover"
            />
          ) : (
            <PlaceholderArt />
          )}
          <span className="absolute top-3 left-3 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
            {platform}
          </span>
          {clip.durationSec ? (
            <span className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white tabular-nums">
              {formatDuration(clip.durationSec)}
            </span>
          ) : null}

          {stage === "idle" ? (
            <button
              ref={playButtonRef}
              type="button"
              onClick={play}
              aria-label={`Play clip: ${clip.title} (loads ${platform})`}
              className="group/play absolute inset-0 grid place-items-center focus-visible:outline-offset-[-4px]"
            >
              <span className="grid size-16 place-items-center rounded-full bg-dusk text-on-accent shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] transition-transform group-hover/play:scale-105">
                <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <div
              role="dialog"
              aria-label={`Load ${platform} video`}
              className="absolute inset-0 grid place-items-center bg-black/75 p-4 text-center text-white backdrop-blur-sm"
            >
              <div className="max-w-xs">
                <p className="text-sm leading-relaxed">This loads content from {platform}, which may set cookies.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button ref={loadButtonRef} size="sm" onClick={accept}>
                    Load video
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={decline}>
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Original artwork for clips without a thumbnail (never platform or Rockstar art). */
function PlaceholderArt() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#2a1240_0%,#8a2350_45%,#ff7a59_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgb(10_11_16/0.65))]" />
      <div className="absolute top-[16%] left-1/2 aspect-square w-[30%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#ffb35c,#ff3d8b)] opacity-85" />
      <PalmSilhouette className="absolute right-[6%] bottom-0 h-[85%] text-[#0a0b10] opacity-80" />
    </div>
  );
}
