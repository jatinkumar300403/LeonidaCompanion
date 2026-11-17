import { ListTree } from "lucide-react";
import type { TocItem } from "@/lib/articles/content";
import { cn } from "@/lib/utils";

/** Table of contents from the article's H1–H3 (SPEC §4): a disclosure on mobile, a sticky list on desktop. */
function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item.id} className={cn(item.level === 3 && "pl-4")}>
          <a
            href={`#${item.id}`}
            className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function TocMobile({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  return (
    <details className="group rounded-xl border bg-surface lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ListTree className="size-4 text-muted-foreground" aria-hidden="true" />
        On this page
        <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <nav aria-label="On this page" className="border-t px-2 py-2">
        <TocList items={items} />
      </nav>
    </details>
  );
}

export function TocDesktop({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-labelledby="toc-heading" className="sticky top-24 hidden lg:block">
      <p id="toc-heading" className="mb-2 px-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        On this page
      </p>
      <TocList items={items} />
    </nav>
  );
}
