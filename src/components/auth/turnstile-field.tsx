"use client";

import dynamic from "next/dynamic";
import { publicEnv } from "@/env.client";

/**
 * The widget itself loads on demand, so pages with a form (the footer newsletter is on every page)
 * don't ship it in their first-load JS (D-099). The box keeps its height while it loads: no shift.
 */
const Turnstile = dynamic(() => import("@marsidev/react-turnstile").then((module) => module.Turnstile), {
  ssr: false,
});

/**
 * Cloudflare Turnstile widget. It adds the hidden `cf-turnstile-response` field to the form it
 * sits in. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (local dev without keys).
 */
export function TurnstileField({ action }: { action: string }) {
  if (!publicEnv.turnstileSiteKey) return null;
  return (
    <div className="min-h-[65px]">
      <Turnstile siteKey={publicEnv.turnstileSiteKey} options={{ action, theme: "auto", size: "flexible" }} />
    </div>
  );
}
