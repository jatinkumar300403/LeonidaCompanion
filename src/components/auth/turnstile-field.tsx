"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { publicEnv } from "@/env.client";

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
