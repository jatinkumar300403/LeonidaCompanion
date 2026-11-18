import type { NextConfig } from "next";
import { CLIP_THUMBNAIL_HOSTS, EMBED_FRAME_HOSTS } from "./src/config/clips";

// Article cover images are served from our own Supabase Storage bucket (SPEC §11).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/**
 * Content-Security-Policy, started in Phase 5 for the clip embeds (D-075): iframes only from the
 * official players and Turnstile, no plugins, no <base> tricks. Phase 9 adds the script, style,
 * image and connect rules from D-014.
 */
const contentSecurityPolicy = [
  `frame-src 'self' ${EMBED_FRAME_HOSTS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

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
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] }];
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

export default nextConfig;
