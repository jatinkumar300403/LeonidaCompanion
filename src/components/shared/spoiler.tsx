"use client";

import { EyeOff } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Spoilers are hidden by default (CLAUDE.md rule 5) and revealed by click, tap, Enter or Space.
 * While hidden the text is blurred, aria-hidden and inert, so screen readers can't spoil it and
 * links inside can't be focused. Revealing is one-way and moves focus to the revealed text.
 */

export function InlineSpoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef<HTMLSpanElement>(null);

  if (revealed) {
    return (
      <span
        ref={revealedRef}
        tabIndex={-1}
        data-spoiler-state="revealed"
        className="rounded-sm bg-pink/12 px-0.5 focus:outline-none"
      >
        {children}
      </span>
    );
  }

  function reveal() {
    setRevealed(true);
    requestAnimationFrame(() => revealedRef.current?.focus());
  }

  // A span with role="button" (not <button>) so a long spoiler wraps with the surrounding text;
  // Chrome always lays a <button> out as one inline-block.
  return (
    <span
      role="button"
      tabIndex={0}
      aria-expanded={false}
      aria-label="Spoiler, hidden. Activate to reveal."
      data-spoiler-state="hidden"
      onClick={reveal}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          reveal();
        }
      }}
      className="cursor-pointer rounded-sm bg-surface-2 [box-decoration-break:clone] px-0.5 [-webkit-box-decoration-break:clone]"
    >
      <span aria-hidden="true" inert className="blur-[5px] select-none">
        {children}
      </span>
    </span>
  );
}

export function SpoilerBlock({
  children,
  label = "Spoiler",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-spoiler-state={revealed ? "revealed" : "hidden"}
      className={cn("my-1 rounded-xl border border-pink/30 bg-pink/5 p-4", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-pink-text">
          <EyeOff className="size-4" aria-hidden="true" />
          {label}
        </span>
        {revealed ? null : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-expanded={false}
            aria-controls={contentId}
            onClick={() => {
              setRevealed(true);
              requestAnimationFrame(() => contentRef.current?.focus());
            }}
          >
            Show spoiler
          </Button>
        )}
      </div>
      <div
        id={contentId}
        ref={contentRef}
        tabIndex={revealed ? -1 : undefined}
        aria-hidden={revealed ? undefined : true}
        inert={!revealed}
        className={cn("mt-3 focus:outline-none", revealed ? "" : "blur-md select-none")}
      >
        {children}
      </div>
    </div>
  );
}
