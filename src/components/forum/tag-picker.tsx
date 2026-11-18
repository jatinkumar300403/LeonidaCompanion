"use client";

import { TAGS } from "@/config/tags";
import { THREAD_LIMITS } from "@/lib/forum/rules";
import { cn } from "@/lib/utils";

/**
 * Up to 5 thread tags as toggle chips (SPEC §5). With `name`, each chosen tag also renders a hidden
 * input, so the picker works inside a FormData form.
 */
export function TagPicker({
  value,
  onChange,
  name,
  labelledBy,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  name?: string;
  labelledBy?: string;
}) {
  const full = value.length >= THREAD_LIMITS.tagsMax;
  return (
    <div role="group" aria-labelledby={labelledBy}>
      <ul className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const on = value.includes(tag.slug);
          return (
            <li key={tag.slug}>
              <button
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => onChange(on ? value.filter((t) => t !== tag.slug) : [...value, tag.slug])}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50",
                  on
                    ? "border-pink/40 bg-pink/12 text-pink-text"
                    : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tag.label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {value.length}/{THREAD_LIMITS.tagsMax} tags
      </p>
      {name ? value.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />) : null}
    </div>
  );
}
