import "server-only";
import { track } from "@vercel/analytics/server";
import { sanitizeEventProps, type AnalyticsEvent, type EventProps } from "@/lib/analytics/events";

/**
 * Server-side custom events (D-094), for actions that end in a redirect (a new thread) or happen
 * only on the server. Runs only on Vercel, where Web Analytics exists; elsewhere it's a no-op so
 * local logs stay quiet. Call it inside `after()` with the request headers captured beforehand.
 */
export async function trackServerEvent(name: AnalyticsEvent, props: EventProps | undefined, headers: Headers) {
  if (!process.env.VERCEL) return;
  try {
    await track(name, sanitizeEventProps(props), { headers });
  } catch (error) {
    console.error("[analytics] server event failed:", error instanceof Error ? error.message : error);
  }
}
