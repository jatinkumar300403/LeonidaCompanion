import "server-only";
import { publicEnv } from "@/env.client";

export const OAUTH_PROVIDERS = ["google", "discord"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * OAuth providers switched on in the Supabase dashboard, read from the public auth settings
 * endpoint (cached for an hour). Buttons only show for providers that will actually work.
 */
export async function getEnabledProviders(): Promise<OAuthProvider[]> {
  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabasePublishableKey;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return OAUTH_PROVIDERS.filter((provider) => settings.external?.[provider] === true);
  } catch {
    return [];
  }
}
