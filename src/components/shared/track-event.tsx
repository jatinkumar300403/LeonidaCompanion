"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEvent, type EventProps } from "@/lib/analytics/events";

/** Sends one analytics event when it mounts (for pages reached by a plain GET form, D-094). */
export function TrackEvent({ name, props }: { name: AnalyticsEvent; props?: EventProps }) {
  const serialized = JSON.stringify(props ?? null);
  useEffect(() => {
    trackEvent(name, JSON.parse(serialized) as EventProps | undefined);
  }, [name, serialized]);
  return null;
}
