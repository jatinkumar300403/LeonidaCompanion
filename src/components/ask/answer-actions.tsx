"use client";

import Link from "next/link";
import { Copy, MessagesSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/events";

/** 👍/👎, Copy and "Ask the community" under an AI answer (SPEC §8.1). UI only until Phase 8. */
export function AnswerActions({ question, answer }: { question: string; answer: string }) {
  const [feedback, setFeedbackState] = useState<1 | -1 | 0>(0);

  function setFeedback(value: 1 | -1 | 0) {
    setFeedbackState(value);
    if (value !== 0) trackEvent("ask_feedback", { helpful: value === 1 });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer);
      toast.success("Answer copied");
    } catch {
      toast.error("Couldn't copy. Select the text instead.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1" role="group" aria-label="Was this answer helpful?">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Helpful"
          aria-pressed={feedback === 1}
          onClick={() => setFeedback(feedback === 1 ? 0 : 1)}
          className={cn(feedback === 1 && "bg-teal/12 text-teal-text")}
        >
          <ThumbsUp aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Not helpful"
          aria-pressed={feedback === -1}
          onClick={() => setFeedback(feedback === -1 ? 0 : -1)}
          className={cn(feedback === -1 && "bg-pink/12 text-pink-text")}
        >
          <ThumbsDown aria-hidden="true" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={copy}>
        <Copy aria-hidden="true" />
        Copy
      </Button>
      <Button asChild variant="outline" size="sm" className="ml-auto">
        <Link href={routes.newThread(question)}>
          <MessagesSquare aria-hidden="true" />
          Ask the community
        </Link>
      </Button>
    </div>
  );
}
