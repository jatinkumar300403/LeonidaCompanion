"use client";

import { useEffect } from "react";
import { FieldError } from "@/components/shared/form-bits";
import { TAGS, SPOILER_LEVELS, FACT_STATUSES, type SpoilerLevel, type FactStatus } from "@/config/tags";
import { TAGS_MAX } from "@/config/articles";
import { cn } from "@/lib/utils";

/** Small building blocks shared by the Quick Tip form and the full article editor. */

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {counter ? <span className="text-xs text-muted-foreground tabular-nums">{counter}</span> : null}
      </div>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** aria props that tie an input to its hint and error. */
export function describedBy(id: string, hint: boolean, error?: string | null) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return { "aria-describedby": ids || undefined, "aria-invalid": error ? true : undefined } as const;
}

/** Toggle chips for tags (big enough to tap on a phone). */
export function TagPicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string | null;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="flex w-full items-baseline justify-between text-sm font-semibold">
        Tags
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {value.length}/{TAGS_MAX}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const selected = value.includes(tag.slug);
          const full = !selected && value.length >= TAGS_MAX;
          return (
            <button
              key={tag.slug}
              type="button"
              aria-pressed={selected}
              disabled={full}
              onClick={() => onChange(selected ? value.filter((t) => t !== tag.slug) : [...value, tag.slug])}
              className={cn(
                "h-9 rounded-full border px-3 text-sm font-medium transition-colors disabled:opacity-50",
                selected
                  ? "border-pink/40 bg-pink/12 text-pink-text"
                  : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
      <FieldError id="tags-error" message={error} />
    </fieldset>
  );
}

function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string | null;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-surface-2 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
              value === option.value
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}

export function SpoilerPicker({ value, onChange }: { value: SpoilerLevel; onChange: (value: SpoilerLevel) => void }) {
  return (
    <Segmented
      name="spoilerLevel"
      legend="Spoilers"
      value={value}
      onChange={onChange}
      options={(Object.keys(SPOILER_LEVELS) as SpoilerLevel[]).map((level) => ({
        value: level,
        label: level === "none" ? "None" : level === "minor" ? "Minor" : "Story",
      }))}
    />
  );
}

export function FactStatusPicker({
  value,
  onChange,
  error,
}: {
  value: FactStatus | "";
  onChange: (value: FactStatus) => void;
  error?: string | null;
}) {
  return (
    <Segmented
      name="factStatus"
      legend="Fact status (required to publish)"
      value={value}
      onChange={onChange}
      error={error}
      options={(Object.keys(FACT_STATUSES) as FactStatus[]).map((status) => ({
        value: status,
        label: FACT_STATUSES[status].label,
      }))}
    />
  );
}

/**
 * Unsaved-changes guard (SPEC §10): the browser's own prompt on reload/close, and a confirm on
 * in-app link clicks (the App Router has no navigation events to hook).
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      if (anchor.origin !== window.location.origin || anchor.hash) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
