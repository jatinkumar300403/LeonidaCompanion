import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Search",
    path: "/search",
    noindex: true,
    description: "Search tips, threads and clips.",
  });
}

/** D-019: a stub that points to Ask AI until unified search ships in Phase 12. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 200) : "";

  return (
    <div className="page-container py-10 sm:py-14">
      <PageHeader eyebrow="Search" title="Search" description="Tips, forum threads and clips in one place." />
      <form action="/search" method="get" role="search" className="mt-8 flex max-w-2xl gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search the site
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search tips, threads and clips…"
          className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base placeholder:text-muted-foreground"
        />
        <Button type="submit" className="h-11">
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>
      <EmptyState
        className="mt-10"
        icon={Search}
        title="Search is coming soon"
        description="Until it's ready, Ask AI can answer most questions with sources."
        actions={
          <Button asChild size="sm">
            <Link href={routes.ask(query || undefined)}>
              <Sparkles aria-hidden="true" />
              Ask AI instead
            </Link>
          </Button>
        }
      />
    </div>
  );
}
