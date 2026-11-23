/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import { CACHE_NAMES, classifyRequest, isRscRequest, OFFLINE_PATH, type CacheRule } from "../lib/pwa/cache-rules";

/**
 * The service worker (SPEC §13 PWA, D-095), bundled by @serwist/turbopack and served at
 * /serwist/sw.js with `Service-Worker-Allowed: /`. Rules live in src/lib/pwa/cache-rules.ts.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

function rule(name: CacheRule) {
  return ({ url, request, sameOrigin }: { url: URL; request: Request; sameOrigin: boolean }) =>
    classifyRequest({
      url,
      sameOrigin,
      method: request.method,
      destination: request.destination,
      isRsc: isRscRequest(request, url),
    }) === name;
}

const okOnly = new CacheableResponsePlugin({ statuses: [200] });

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: rule("static"),
    handler: new CacheFirst({
      cacheName: CACHE_NAMES.static,
      plugins: [okOnly, new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * DAY })],
    }),
  },
  {
    matcher: rule("image"),
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.images,
      plugins: [okOnly, new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    // SPEC §13: read guides offline.
    matcher: rule("article"),
    handler: new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.articles,
      plugins: [okOnly, new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    matcher: rule("page"),
    handler: new NetworkFirst({
      cacheName: CACHE_NAMES.pages,
      networkTimeoutSeconds: 4,
      plugins: [okOnly, new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * DAY })],
    }),
  },
  // Never cached, but routed so the offline page can stand in when the network is gone.
  { matcher: rule("private"), handler: new NetworkOnly() },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [{ url: OFFLINE_PATH, matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
