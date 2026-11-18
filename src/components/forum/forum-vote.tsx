"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { formatCount } from "@/lib/format";
import type { VoteValue } from "@/lib/forum/reputation";
import { signInPath } from "@/lib/auth/redirect";
import { vote } from "@/server/forum/actions";

/**
 * Up/down votes on a thread or reply (SPEC §5): optimistic, toggled by pressing again, rolled back
 * with a toast when the server refuses. Signed-out visitors get a sign-in link; your own posts
 * show the score only.
 */
export function ForumVote({
  targetType,
  targetId,
  score,
  myVote,
  mode,
  returnTo,
}: {
  targetType: "thread" | "post";
  targetId: number;
  score: number;
  myVote: VoteValue;
  /** "static": score only (your own post, or a deleted one). */
  mode: "vote" | "own" | "static" | "signed-out";
  returnTo: string;
}) {
  if (mode === "own" || mode === "static") {
    return (
      <div
        className="flex min-w-12 flex-col items-center text-muted-foreground"
        title={mode === "own" ? "Your own post" : undefined}
      >
        <ArrowBigUp className="size-5 opacity-40" aria-hidden="true" />
        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
          <span className="sr-only">Score </span>
          {formatCount(score)}
        </span>
        <ArrowBigDown className="size-5 opacity-40" aria-hidden="true" />
      </div>
    );
  }
  if (mode === "signed-out") {
    return (
      <div className="flex min-w-12 flex-col items-center">
        <Link
          href={signInPath(returnTo)}
          aria-label="Sign in to vote"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowBigUp className="size-5" aria-hidden="true" />
        </Link>
        <span className="font-mono text-sm font-semibold tabular-nums">
          <span className="sr-only">Score </span>
          {formatCount(score)}
        </span>
        <Link
          href={signInPath(returnTo)}
          aria-label="Sign in to vote"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowBigDown className="size-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }
  return (
    <VoteButtons
      key={`${score}:${myVote}`}
      initialScore={score}
      initialVote={myVote}
      label={targetType === "thread" ? "thread" : "reply"}
      onVote={async (value) => {
        const result = await vote({ targetType, targetId, value });
        if (!result.ok) {
          toast.error(result.message);
          throw new Error(result.message);
        }
      }}
    />
  );
}
