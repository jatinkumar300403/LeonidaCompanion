"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleCard } from "@/components/articles/article-card";
import { Button } from "@/components/ui/button";
import type { ArticleListItem } from "@/lib/articles/view";

/**
 * Infinite scroll for section indexes (SPEC §4). The server renders a real <a href="?cursor=…">
 * "Load more" link (works without JS, crawlable); with JS, the link fetches the next page from
 * /api/articles and appends it, and an IntersectionObserver loads more as the reader nears it.
 */
export function LoadMore({
  initialCursor,
  query,
  basePath,
}: {
  initialCursor: string;
  query: { type: string; tag: string | null; spoilerFree: boolean; sort: string };
  /** The index page ("/tips"); the fallback link is basePath + the filters + ?cursor=. */
  basePath: string;
}) {
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ type: query.type, sort: query.sort, cursor });
      if (query.tag) params.set("tag", query.tag);
      if (!query.spoilerFree) params.set("spoilers", "1");
      const response = await fetch(`/api/articles?${params.toString()}`);
      if (!response.ok) throw new Error(String(response.status));
      const page = (await response.json()) as { items: ArticleListItem[]; nextCursor: string | null };
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, query.sort, query.spoilerFree, query.tag, query.type]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, failed, load]);

  const nextHref = (() => {
    const params = new URLSearchParams();
    if (query.tag) params.set("tag", query.tag);
    if (!query.spoilerFree) params.set("spoilers", "1");
    if (query.sort !== "latest") params.set("sort", query.sort);
    if (cursor) params.set("cursor", cursor);
    return `${basePath}?${params.toString()}`;
  })();

  return (
    <>
      {items.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="More articles">
          {items.map((item) => (
            <li key={item.id} className="flex">
              <ArticleCard item={item} className="w-full" />
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={sentinel} className="mt-8 flex flex-col items-center gap-2" aria-live="polite">
        {cursor ? (
          <Button asChild variant="secondary" disabled={loading}>
            <a
              href={nextHref}
              onClick={(event) => {
                event.preventDefault();
                void load();
              }}
            >
              {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {loading ? "Loading…" : "Load more"}
            </a>
          </Button>
        ) : items.length > 0 ? (
          <p className="text-sm text-muted-foreground">That’s everything for now.</p>
        ) : null}
        {failed ? <p className="text-sm text-destructive">That didn’t load. Try the button again.</p> : null}
      </div>
    </>
  );
}
