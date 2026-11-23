"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SW_URL = "/serwist/sw.js";

/**
 * Registers the service worker (SPEC §13 PWA, D-095) once the page has loaded, in production
 * builds only, so dev and E2E never cache. It stands in for `@serwist/turbopack/react`'s provider
 * (about 9 KB of first-load JS) with the two parts we use:
 * - registration with scope "/" (the route sends Service-Worker-Allowed: /);
 * - "cache on navigation": client-side navigations don't fetch HTML, so each new path is sent to
 *   the worker (`CACHE_URLS`, which Serwist handles) to keep guides readable offline.
 */
export function ServiceWorker() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register(SW_URL, { scope: "/", type: "module" }).catch((error: unknown) => {
        console.warn("[pwa] service worker registration failed:", error instanceof Error ? error.message : error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.controller?.postMessage({
      type: "CACHE_URLS",
      payload: { urlsToCache: [`${window.location.pathname}${window.location.search}`] },
    });
  }, [pathname]);

  return null;
}
