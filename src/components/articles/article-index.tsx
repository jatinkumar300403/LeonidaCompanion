import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { ArticleCard } from "@/components/articles/article-card";
import { LoadMore } from "@/components/articles/load-more";
import { PageHeader } from "@/components/shared/headers";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { ArticleType } from "@/config/articles";
import { TAGS } from "@/config/tags";
import { indexHref, type IndexState } from "@/lib/articles/index-url";
import { cn } from "@/lib/utils";
import type { ArticlePage } from "@/server/articles/queries";

/**
 * Section index (SPEC §4): tag chips, a spoiler-free toggle (on by default), sort, and the list
 * with cursor pagination. Every control is a real link, so it all works before hydration.
 */
export function ArticleIndex({
  type,
  basePath,
  eyebrow,
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  state,
  page,
  intro,
}: {
  type: ArticleType;
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  state: IndexState;
  page: ArticlePage;
  /** Extra content under the header (e.g. the fact status legend). */
  intro?: React.ReactNode;
}) {
  const filtered = Boolean(state.tag) || !state.spoilerFree;

  return (
    <div className="page-container py-10 sm:py-14">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {intro ? <div className="mt-6">{intro}</div> : null}

      <nav aria-label="Filter and sort" className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleLink
            href={indexHref(basePath, { ...state, cursor: null, spoilerFree: !state.spoilerFree })}
            active={state.spoilerFree}
            icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          >
            Spoiler-free only
          </ToggleLink>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          {/* One group, so the sort controls wrap together on a phone. */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Sort:
            </span>
            <ToggleLink
              href={indexHref(basePath, { ...state, cursor: null, sort: "latest" })}
              active={state.sort === "latest"}
            >
              Latest
            </ToggleLink>
            <ToggleLink
              href={indexHref(basePath, { ...state, cursor: null, sort: "helpful" })}
              active={state.sort === "helpful"}
            >
              Most helpful
            </ToggleLink>
          </div>
        </div>

        <ul
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          aria-label="Tags"
        >
          <li className="shrink-0">
            <ToggleLink href={indexHref(basePath, { ...state, cursor: null, tag: null })} active={!state.tag} size="sm">
              All
            </ToggleLink>
          </li>
          {TAGS.map((tag) => (
            <li key={tag.slug} className="shrink-0">
              <ToggleLink
                href={indexHref(basePath, { ...state, cursor: null, tag: state.tag === tag.slug ? null : tag.slug })}
                active={state.tag === tag.slug}
                size="sm"
              >
                {tag.label}
              </ToggleLink>
            </li>
          ))}
        </ul>
      </nav>

      {page.items.length > 0 ? (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((item) => (
              <li key={item.id} className="flex">
                <ArticleCard item={item} className="w-full" />
              </li>
            ))}
          </ul>
          {page.nextCursor ? (
            <LoadMore
              key={`${state.tag}-${state.spoilerFree}-${state.sort}-${state.cursor}`}
              initialCursor={page.nextCursor}
              basePath={basePath}
              query={{ type, tag: state.tag, spoilerFree: state.spoilerFree, sort: state.sort }}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          className="mt-8"
          icon={icon}
          title={filtered ? "Nothing matches these filters yet" : emptyTitle}
          description={filtered ? "Try another tag, or include articles with spoilers." : emptyDescription}
          actions={
            filtered ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={indexHref(basePath, {})}>Clear filters</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm">
                  <Link href="/ask">Ask AI</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/forum">Visit the forum</Link>
                </Button>
              </>
            )
          }
        />
      )}
    </div>
  );
}

function ToggleLink({
  href,
  active,
  icon,
  size = "default",
  children,
}: {
  href: ReturnType<typeof indexHref>;
  active: boolean;
  icon?: React.ReactNode;
  size?: "default" | "sm";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm",
        active
          ? "border-pink/40 bg-pink/12 text-pink-text"
          : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
