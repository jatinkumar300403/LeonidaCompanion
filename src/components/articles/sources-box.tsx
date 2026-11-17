import { ExternalLink } from "lucide-react";
import { hostnameOf } from "@/lib/format";
import type { ArticleSource } from "@/lib/validation/article";

const accessed = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function formatAccessed(date: string): string | null {
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime()) ? null : accessed.format(value);
}

/** Numbered sources with domain and access date (SPEC §4, CLAUDE.md rule 7). */
export function SourcesBox({ sources }: { sources: ArticleSource[] }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="sources-heading" className="rounded-xl border bg-surface p-5">
      <h2 id="sources-heading" className="text-base font-semibold">
        Sources
      </h2>
      <ol className="mt-3 flex flex-col gap-3 text-sm">
        {sources.map((source, index) => {
          const domain = hostnameOf(source.url);
          const date = source.accessed_at ? formatAccessed(source.accessed_at) : null;
          return (
            <li key={`${source.url}-${index}`} className="flex gap-3">
              <span className="font-mono text-xs leading-6 text-muted-foreground tabular-nums">{index + 1}.</span>
              <div className="min-w-0">
                <a
                  href={source.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="inline-flex items-center gap-1 link-dusk font-medium break-words"
                >
                  {source.title}
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <p className="text-xs text-muted-foreground">
                  {domain}
                  {date ? ` · accessed ${date}` : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
