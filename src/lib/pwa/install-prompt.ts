import { trackEvent } from "@/lib/analytics/events";

/**
 * Captures the browser's install events as early as possible (from src/instrumentation-client.ts,
 * before hydration), so the custom install banner (SPEC §13) never misses `beforeinstallprompt`.
 * A tiny external store for `useSyncExternalStore`.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPromptState = { canPrompt: boolean; installed: boolean };

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallPromptState = { canPrompt: false, installed: false };
let listening = false;
const listeners = new Set<() => void>();

function setState(next: InstallPromptState) {
  state = next;
  for (const listener of listeners) listener();
}

export function captureInstallEvents(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    // Hold Chrome's own mini-infobar back: our banner asks at a better moment (2nd visit).
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    setState({ ...state, canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    trackEvent("pwa_installed");
    setState({ canPrompt: false, installed: true });
  });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPromptState(): InstallPromptState {
  return state;
}

const SERVER_STATE: InstallPromptState = { canPrompt: false, installed: false };
export function getServerInstallPromptState(): InstallPromptState {
  return SERVER_STATE;
}

/** Shows the browser's install dialog. The prompt works once, so it's dropped afterwards. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  setState({ ...state, canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}
