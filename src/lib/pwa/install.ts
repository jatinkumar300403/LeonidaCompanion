/**
 * When to show the custom install banner (SPEC §13: "after the 2nd visit", D-095). Pure, so it's
 * unit-tested; the component feeds it what it reads from storage and the browser.
 */
export const INSTALL_STORAGE = {
  visits: "la_visits",
  dismissedAt: "la_install_dismissed_at",
  /** sessionStorage: this tab's visit was already counted. */
  counted: "la_visit_counted",
} as const;

export const MIN_VISITS = 2;
export const SNOOZE_DAYS = 30;

export type InstallBannerInput = {
  visits: number;
  /** ms timestamp of the last "Not now", or null. */
  dismissedAt: number | null;
  now: number;
  /** Already running as an installed app. */
  standalone: boolean;
  /** Chrome/Edge/Android gave us a `beforeinstallprompt` event. */
  canPrompt: boolean;
  /** iOS Safari: no prompt API, but "Add to Home Screen" works. */
  iosSafari: boolean;
  installed: boolean;
};

export type InstallBannerMode = "hidden" | "prompt" | "ios";

export function installBannerMode(input: InstallBannerInput): InstallBannerMode {
  if (input.standalone || input.installed) return "hidden";
  if (input.visits < MIN_VISITS) return "hidden";
  if (input.dismissedAt !== null && input.now - input.dismissedAt < SNOOZE_DAYS * 86_400_000) return "hidden";
  if (input.canPrompt) return "prompt";
  if (input.iosSafari) return "ios";
  return "hidden";
}

/** Parses a stored counter or timestamp; anything odd reads as missing. */
export function readNumber(value: string | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/** iPhone/iPad Safari (not Chrome, Firefox or in-app browsers on iOS, which can't install). */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!ios) return false;
  return /Safari\//.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(userAgent);
}
