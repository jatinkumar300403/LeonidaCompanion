import { Sparkles } from "lucide-react";
import { AnswerActions } from "@/components/ask/answer-actions";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Card } from "@/components/ui/card";
import { hostnameOf } from "@/lib/format";
import type { AnswerSource } from "@/types/content";

/**
 * AI answer (static in Phase 1; Phase 8 streams it). The body cites sources as [n]; each chip
 * links to the numbered Sources list, which carries licence/attribution lines (CLAUDE.md rule 4).
 */
export function AnswerCard({
  question,
  answer,
  sources,
}: {
  question: string;
  answer: string;
  sources: AnswerSource[];
}) {
  return (
    <Card accent className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-dusk text-on-accent">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        AI answer
        <span className="font-normal text-muted-foreground">· from cited sources, may be wrong</span>
      </div>
      <p className="mt-4 font-display text-lg font-semibold">{question}</p>

      <MarkdownRenderer source={answer} size="sm" citations={sources.length} className="mt-3" />

      {sources.length > 0 ? (
        <section aria-label="Sources" className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold">Sources</h3>
          <ol className="mt-2 space-y-2 text-sm">
            {sources.map((source) => (
              <li key={source.n} id={`source-${source.n}`} className="flex scroll-mt-24 gap-2">
                <span className="font-mono text-xs leading-5 text-muted-foreground">[{source.n}]</span>
                <div className="min-w-0">
                  <a href={source.url} rel="noopener noreferrer" className="font-medium hover:underline">
                    {source.title}
                  </a>
                  <span className="text-muted-foreground"> · {source.sourceName || hostnameOf(source.url)}</span>
                  {source.attribution ? (
                    <p className="text-xs text-muted-foreground">
                      {source.attribution}
                      {source.license ? ` (${source.license})` : null}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-5 border-t pt-4">
        <AnswerActions question={question} answer={answer} />
      </div>
    </Card>
  );
}
