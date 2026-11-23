"use client";

import { BookOpen, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CACHE_NAMES, isArticlePath } from "@/lib/pwa/cache-rules";

type SavedPage = { path: string; title: string };

const MAX_SAVED = 12;

/** "Guide title | Site" → "Guide title". */
function pageTitle(html: string, fallback: string): string {
  const match = /<title>([^<]{1,200})<\/title>/i.exec(html);
  const text = match?.[1]
    ?.replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
  return text ? (text.split(" | ")[0] ?? text) : fallback;
}

async function readSavedPages(): Promise<SavedPage[]> {
  if (typeof caches === "undefined") return [];
  const found: SavedPage[] = [];
  for (const name of [CACHE_NAMES.articles, CACHE_NAMES.pages]) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      if (url.origin !== window.location.origin || !isArticlePath(url.pathname)) continue;
      if (found.some((page) => page.path === url.pathname)) continue;
      const response = await cache.match(request);
      const html = response ? await response.text() : "";
      found.push({ path: url.pathname, title: pageTitle(html, url.pathname) });
      if (found.length >= MAX_SAVED) return found;
    }
  }
  return found;
}

/**
 * The offline page's retry button and the guides this browser has saved (SPEC §13: read guides
 * offline). Links are plain <a> tags so the service worker answers them from its cache.
 */
export function SavedPages() {
  const [pages, setPages] = useState<SavedPage[] | null>(null);

  // Back online: load the page that was asked for (the offline page stood in for it).
  useEffect(() => {
    const reload = () => window.location.reload();
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readSavedPages()
      .then((list) => !cancelled && setPages(list))
      .catch(() => !cancelled && setPages([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        {/* A plain link reloads the page you asked for, even if the app's code isn't cached. */}
        <Button asChild>
          <a href="">
            <RotateCw aria-hidden="true" />
            Try again
          </a>
        </Button>
      </div>
      <section aria-labelledby="saved-heading" className="rounded-xl border bg-surface p-5">
        <h2 id="saved-heading" className="font-display text-lg font-semibold">
          Saved on this device
        </h2>
        {pages === null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Guides you&apos;ve opened before still open without a connection: go back, or open one from your history.
          </p>
        ) : pages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing yet. Guides you open while online are kept here so you can read them offline.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {pages.map((page) => (
              <li key={page.path}>
                <a
                  href={page.path}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface-2"
                >
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{page.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
