import Link from "next/link";
import { CircleHelp, EyeOff, Lock, MessagesSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { ForumCategory } from "@/server/forum/model";

/** A forum category on /forum: name, description, thread count and its mode (Q&A, spoilers, locked). */
export function CategoryCard({ category, readOnly }: { category: ForumCategory; readOnly: boolean }) {
  return (
    <article className="group relative flex h-full flex-col rounded-[14px] border bg-surface p-4 transition-colors hover:bg-accent/50 sm:p-5">
      <h3 className="text-base leading-snug font-semibold">
        <Link
          href={routes.forumCategory(category.slug)}
          className="group-has-[a:focus-visible]:underline after:absolute after:inset-0 focus-visible:outline-none"
        >
          {category.name}
        </Link>
      </h3>
      {category.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessagesSquare className="size-3.5" aria-hidden="true" />
          <span className="font-semibold tabular-nums">{formatCount(category.threadCount)}</span>
          {category.threadCount === 1 ? "thread" : "threads"}
        </span>
        {category.isQa ? (
          <Badge variant="teal" size="sm">
            <CircleHelp aria-hidden="true" />
            Q&amp;A
          </Badge>
        ) : null}
        {category.spoilersAllowed ? (
          <Badge variant="pink" size="sm">
            <EyeOff aria-hidden="true" />
            Spoilers
          </Badge>
        ) : null}
        {readOnly ? (
          <Badge variant="tag" size="sm">
            <Lock aria-hidden="true" />
            Read-only
          </Badge>
        ) : null}
      </div>
    </article>
  );
}
