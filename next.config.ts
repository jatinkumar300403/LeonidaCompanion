import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { withSerwist } from "@serwist/turbopack";
import { CLIP_THUMBNAIL_HOSTS } from "./src/config/clips";
import { securityHeaders } from "./src/lib/security/headers";

// Article cover images are served from our own Supabase Storage bucket (SPEC §11).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/** SPEC §13 security headers + strict CSP without nonces (D-014, D-075, D-092). */
const headers = securityHeaders({
  dev: process.env.NODE_ENV === "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Links are checked against real routes at type-check time (`pnpm typecheck` runs `next typegen` first).
  typedRoutes: true,
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/article-images/**",
            },
          ]
        : []),
      // Clip thumbnails from the platforms' CDNs (SPEC §6); resolveClip stores only these hosts.
      ...CLIP_THUMBNAIL_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers },
      // The service worker must never be served stale (D-095); the route sets Service-Worker-Allowed: /.
      { source: "/serwist/:path*", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/**
 * Sentry (D-093): a no-op without NEXT_PUBLIC_SENTRY_DSN. Source maps are uploaded only from CI or
 * Vercel builds that have SENTRY_AUTH_TOKEN; local builds never upload. Under Turbopack the upload
 * runs in Next's runAfterProductionCompile hook.
 */
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && (process.env.CI || process.env.VERCEL));

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !uploadSourceMaps, deleteSourcemapsAfterUpload: true },
  bundleSizeOptimizations: { excludeDebugStatements: true },
});
