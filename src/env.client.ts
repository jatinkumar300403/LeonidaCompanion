import { parsePublicEnv } from "@/lib/env/public";

/**
 * NEXT_PUBLIC_* values, safe for Client Components. Each variable is referenced literally so
 * Next.js inlines it at build time. Server code may import this too.
 */
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_HOSTS: process.env.NEXT_PUBLIC_SITE_HOSTS,
  NEXT_PUBLIC_SHOW_IMPRESSUM: process.env.NEXT_PUBLIC_SHOW_IMPRESSUM,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
