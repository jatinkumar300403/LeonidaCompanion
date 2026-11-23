import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Web app manifest (SPEC §13 PWA, D-095). Icons come from the original logo mark
 * (`pnpm gen:icons`); the maskable ones keep it inside the safe zone. No game art (rule 2).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0b10",
    // SPEC §13: the dusk theme colour. Pages override it with their own theme-color once loaded.
    theme_color: "#ff3d8b",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Tips & Tricks", short_name: "Tips", url: "/tips" },
      { name: "Ask AI", short_name: "Ask", url: "/ask" },
      { name: "Help Forum", short_name: "Forum", url: "/forum" },
      { name: "Clips", short_name: "Clips", url: "/clips" },
    ],
  };
}
