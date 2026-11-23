"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  getInstallPromptState,
  getServerInstallPromptState,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/pwa/install-prompt";
import { INSTALL_STORAGE, installBannerMode, isIosSafari, readNumber, type InstallBannerMode } from "@/lib/pwa/install";

function storageGet(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: "local" | "session", key: string, value: string): void {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Private mode or storage disabled: the banner just won't remember.
  }
}

/** Counts one visit per browser session and returns the total. */
function countVisit(): number {
  const visits = readNumber(storageGet("local", INSTALL_STORAGE.visits)) ?? 0;
  if (storageGet("session", INSTALL_STORAGE.counted)) return visits;
  storageSet("session", INSTALL_STORAGE.counted, "1");
  storageSet("local", INSTALL_STORAGE.visits, String(visits + 1));
  return visits + 1;
}

/**
 * Custom install banner (SPEC §13): from the 2nd visit, when the browser can install the app.
 * Fixed above the bottom tab bar on phones and as a corner card on desktop, so it never shifts the
 * layout. "Not now" hides it for 30 days. iOS Safari gets the Share → Add to Home Screen hint.
 */
export function InstallBanner() {
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState, getServerInstallPromptState);
  const [env, setEnv] = useState<{ visits: number; standalone: boolean; ios: boolean; now: number } | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Reading browser-only state once after hydration; the server always renders nothing here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setDismissedAt(readNumber(storageGet("local", INSTALL_STORAGE.dismissedAt)));
    setEnv({
      visits: countVisit(),
      standalone,
      ios: isIosSafari(navigator.userAgent, navigator.maxTouchPoints),
      now: Date.now(),
    });
  }, []);

  const mode: InstallBannerMode = env
    ? installBannerMode({
        visits: env.visits,
        dismissedAt,
        now: env.now,
        standalone: env.standalone,
        canPrompt: prompt.canPrompt,
        iosSafari: env.ios,
        installed: prompt.installed,
      })
    : "hidden";

  if (mode === "hidden") return null;

  function dismiss() {
    const now = Date.now();
    storageSet("local", INSTALL_STORAGE.dismissedAt, String(now));
    setDismissedAt(now);
  }

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "dismissed") dismiss();
  }

  return (
    <section
      aria-labelledby="install-banner-title"
      data-testid="install-banner"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border bg-surface p-4 shadow-card motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0 lg:w-96"
    >
      <div className="flex items-start gap-3">
        <LogoMark className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id="install-banner-title" className="font-display text-base font-semibold">
            Install {siteConfig.name}
          </h2>
          {mode === "prompt" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Open it from your home screen like an app, and read saved guides offline.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> then{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span> to keep it one tap away.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-1 size-9 shrink-0"
          aria-label="Close install suggestion"
          onClick={dismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {mode === "prompt" ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={install}>
            <Download aria-hidden="true" />
            Install
          </Button>
        </div>
      ) : null}
    </section>
  );
}
