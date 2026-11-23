import { CLIP_THUMBNAIL_HOSTS, EMBED_FRAME_HOSTS } from "../../config/clips";

/**
 * Security headers and the Content-Security-Policy (SPEC §13, D-014, D-092). Pure, so
 * next.config.ts and the unit tests share it. No nonces: they would force every page to render
 * per request and break ISR (D-014). `'unsafe-inline'` scripts are the accepted cost; user HTML is
 * never rendered (rehype-sanitize), which is the main XSS control.
 */

export type CspOptions = {
  /** `next dev` needs eval for React Refresh. */
  dev: boolean;
  /** NEXT_PUBLIC_SUPABASE_URL: API, auth and storage images. */
  supabaseUrl?: string | null;
  /** NEXT_PUBLIC_SENTRY_DSN: errors go straight to its ingest host. */
  sentryDsn?: string | null;
};

/** Cloudflare Turnstile: script, iframe and its verify calls. */
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * TikTok's `embed.js` and what it pulls in. Unverified from the build machine (TikTok is
 * DNS-blocked in India, D-071), so the CDN hosts are allowed by wildcard.
 */
const TIKTOK_SCRIPT_HOSTS = [
  "https://www.tiktok.com",
  "https://*.tiktokcdn.com",
  "https://*.tiktokcdn-us.com",
  "https://*.ttwstatic.com",
] as const;

function origin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** "**.tiktokcdn.com" (next/image pattern) → "https://*.tiktokcdn.com" (CSP source). */
export function thumbnailSources(): string[] {
  return CLIP_THUMBNAIL_HOSTS.map((host) => `https://${host.startsWith("**.") ? `*.${host.slice(3)}` : host}`);
}

export function buildCspDirectives({ dev, supabaseUrl, sentryDsn }: CspOptions): Record<string, string[]> {
  const supabase = origin(supabaseUrl);
  const sentry = origin(sentryDsn);
  const supabaseWs = supabase ? supabase.replace(/^http/, "ws") : null;
  const present = (values: (string | null)[]) => values.filter((value): value is string => Boolean(value));

  return {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), TURNSTILE, ...TIKTOK_SCRIPT_HOSTS],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...present([supabase]), ...thumbnailSources()],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...present([supabase, supabaseWs, sentry]), TURNSTILE, ...(dev ? ["ws:"] : [])],
    "frame-src": ["'self'", ...EMBED_FRAME_HOSTS],
    "media-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
}

export function buildCsp(options: CspOptions): string {
  return Object.entries(buildCspDirectives(options))
    .map(([directive, sources]) => `${directive} ${[...new Set(sources)].join(" ")}`)
    .join("; ");
}

/**
 * Permissions-Policy: turn off powerful features we never use. Fullscreen, autoplay,
 * encrypted-media and picture-in-picture stay at their defaults because the clip players need them.
 */
export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "browsing-topics=()",
].join(", ");

export function securityHeaders(options: CspOptions): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(options) },
    // No `preload` while the domain is undecided (Q4); browsers ignore HSTS over plain http.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
