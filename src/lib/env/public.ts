/**
 * Browser-safe reader for the NEXT_PUBLIC_* variables. Deliberately zod-free so validation code
 * never ships to the client: the full zod check of these same values runs on the server at boot
 * (src/env.ts via src/instrumentation.ts).
 */

export type PublicEnv = {
  siteName: string | undefined;
  siteUrl: string;
  siteHosts: string[];
  showImpressum: boolean;
  supabaseConfigured: boolean;
  /** Project URL without a trailing slash, when configured. */
  supabaseUrl: string | undefined;
  supabasePublishableKey: string | undefined;
  turnstileSiteKey: string | undefined;
  sentryDsn: string | undefined;
  /** Public contact address shown on /contact; never the admin's own address. */
  contactEmail: string | undefined;
};

export type RawPublicEnv = {
  NEXT_PUBLIC_SITE_NAME?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SITE_HOSTS?: string;
  NEXT_PUBLIC_SHOW_IMPRESSUM?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  NEXT_PUBLIC_CONTACT_EMAIL?: string;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** "localhost, Example.com:443 ,www.example.com" → ["localhost", "example.com", "www.example.com"] */
export function parseHostList(value: string | undefined): string[] {
  const hosts = (clean(value) ?? "localhost")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/:\d+$/, ""))
    .filter(Boolean);
  return [...new Set(hosts)];
}

export function parsePublicEnv(raw: RawPublicEnv): PublicEnv {
  const siteUrl = (clean(raw.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(/\/+$/, "");
  const supabaseUrl = clean(raw.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/+$/, "");
  const supabasePublishableKey = clean(raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return {
    siteName: clean(raw.NEXT_PUBLIC_SITE_NAME),
    siteUrl,
    siteHosts: parseHostList(raw.NEXT_PUBLIC_SITE_HOSTS),
    showImpressum: clean(raw.NEXT_PUBLIC_SHOW_IMPRESSUM)?.toLowerCase() === "true",
    supabaseConfigured: Boolean(supabaseUrl && supabasePublishableKey),
    supabaseUrl,
    supabasePublishableKey,
    turnstileSiteKey: clean(raw.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    sentryDsn: clean(raw.NEXT_PUBLIC_SENTRY_DSN),
    contactEmail: clean(raw.NEXT_PUBLIC_CONTACT_EMAIL),
  };
}
