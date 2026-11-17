"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { useState } from "react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Vote = -1 | 0 | 1;

/** Next state after pressing a button: pressing your current vote again removes it. */
export function nextVote(current: Vote, pressed: 1 | -1): Vote {
  return current === pressed ? 0 : pressed;
}

/**
 * Up/down votes with optimistic UI (SPEC §2/§5). Phase 1 is UI only; Phase 4 passes `onVote`
 * (a Server Action) and rolls back if it fails.
 */
export function VoteButtons({
  initialScore,
  initialVote = 0,
  orientation = "vertical",
  label = "post",
  onVote,
  className,
}: {
  initialScore: number;
  initialVote?: Vote;
  orientation?: "vertical" | "horizontal";
  /** What is being voted on, for screen readers ("thread", "post", "clip"). */
  label?: string;
  onVote?: (vote: Vote) => Promise<void> | void;
  className?: string;
}) {
  const [vote, setVote] = useState<Vote>(initialVote);
  const score = initialScore - initialVote + vote;

  function press(direction: 1 | -1) {
    const previous = vote;
    const next = nextVote(previous, direction);
    setVote(next);
    Promise.resolve(onVote?.(next)).catch(() => setVote(previous));
  }

  const buttonClass =
    "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div
      role="group"
      aria-label={`Vote on this ${label}`}
      className={cn("inline-flex items-center", orientation === "vertical" ? "flex-col" : "flex-row gap-1", className)}
    >
      <button
        type="button"
        aria-pressed={vote === 1}
        aria-label="Upvote"
        onClick={() => press(1)}
        className={cn(buttonClass, vote === 1 && "text-pink-text")}
      >
        <ArrowBigUp className={cn("size-5", vote === 1 && "fill-current")} aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center font-mono text-sm font-semibold tabular-nums" aria-live="polite">
        <span className="sr-only">Score </span>
        {formatCount(score)}
      </span>
      <button
        type="button"
        aria-pressed={vote === -1}
        aria-label="Downvote"
        onClick={() => press(-1)}
        className={cn(buttonClass, vote === -1 && "text-violet-text")}
      >
        <ArrowBigDown className={cn("size-5", vote === -1 && "fill-current")} aria-hidden="true" />
      </button>
    </div>
  );
}
