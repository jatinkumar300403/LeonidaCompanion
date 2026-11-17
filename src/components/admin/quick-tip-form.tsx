"use client";

import type { Route } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { describedBy, Field, SpoilerPicker, TagPicker, useUnsavedGuard } from "@/components/admin/editor-fields";
import { Notice } from "@/components/shared/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QUICK_TIP, TITLE_MAX } from "@/config/articles";
import type { SpoilerLevel } from "@/config/tags";
import { countSentences } from "@/lib/articles/content";
import { quickPublishTip, type ArticleActionResult } from "@/server/articles/actions";

type Values = { title: string; body: string; sourceUrl: string; tags: string[]; spoilerLevel: SpoilerLevel };
const EMPTY: Values = { title: "", body: "", sourceUrl: "", tags: [], spoilerLevel: "none" };

/**
 * Quick Tip mode (SPEC §10): title + 2–5 sentences + optional source + tags → Publish, from a phone
 * in under a minute. One column of large fields; the action bar sticks to the bottom of the screen.
 */
export function QuickTipForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [result, setResult] = useState<ArticleActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = values !== EMPTY && result?.ok !== true;
  useUnsavedGuard(dirty && !pending);

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const sentences = countSentences(values.body);
  const sentenceHint =
    sentences === 0
      ? `Aim for ${QUICK_TIP.sentencesMin}–${QUICK_TIP.sentencesMax} sentences.`
      : sentences < QUICK_TIP.sentencesMin
        ? `${sentences} sentence: add one more if you can.`
        : sentences > QUICK_TIP.sentencesMax
          ? `${sentences} sentences: consider full mode for longer tips.`
          : `${sentences} sentences: good length.`;

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function submit(intent: "publish" | "draft") {
    startTransition(async () => {
      setResult(await quickPublishTip(values, intent));
    });
  }

  if (result?.ok) {
    return (
      <div
        className="flex flex-col items-start gap-4 rounded-xl border bg-card p-5"
        role="status"
        data-testid="quick-tip-done"
      >
        <p className="flex items-center gap-2 text-lg font-semibold text-teal-text">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {result.message}
        </p>
        <p className="text-sm text-muted-foreground">{result.article.title}</p>
        <div className="flex flex-wrap gap-2">
          {result.url ? (
            <Button asChild>
              <Link href={result.url}>
                View tip
                <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link href={`/admin/articles/${result.article.id}` as Route}>Edit in full mode</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setValues(EMPTY);
              setResult(null);
            }}
          >
            Write another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit("publish");
      }}
      className="flex flex-col gap-6 pb-28 sm:pb-6"
      noValidate
    >
      {result && !result.ok ? <Notice tone="error">{result.message}</Notice> : null}

      <Field id="qt-title" label="Title" error={errors.title} counter={`${values.title.length}/${TITLE_MAX}`}>
        <Input
          id="qt-title"
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          maxLength={TITLE_MAX}
          autoComplete="off"
          enterKeyHint="next"
          placeholder="How to lose a wanted level fast"
          className="h-12 text-base"
          {...describedBy("qt-title", false, errors.title)}
        />
      </Field>

      <Field
        id="qt-body"
        label="The tip"
        hint={sentenceHint}
        error={errors.body}
        counter={`${values.body.length}/${QUICK_TIP.bodyMax}`}
      >
        <Textarea
          id="qt-body"
          value={values.body}
          onChange={(event) => set("body", event.target.value)}
          maxLength={QUICK_TIP.bodyMax}
          rows={6}
          placeholder="Two to five short sentences. Markdown and ||spoilers|| work."
          className="min-h-36 text-base"
          {...describedBy("qt-body", true, errors.body)}
        />
      </Field>

      <Field id="qt-source" label="Source link (optional)" error={errors.sourceUrl}>
        <Input
          id="qt-source"
          type="url"
          inputMode="url"
          value={values.sourceUrl}
          onChange={(event) => set("sourceUrl", event.target.value)}
          placeholder="https://"
          className="h-12 text-base"
          {...describedBy("qt-source", false, errors.sourceUrl)}
        />
      </Field>

      <TagPicker value={values.tags} onChange={(tags) => set("tags", tags)} error={errors.tags} />
      <SpoilerPicker value={values.spoilerLevel} onChange={(level) => set("spoilerLevel", level)} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button type="button" variant="secondary" size="lg" disabled={pending} onClick={() => submit("draft")}>
            Save draft
          </Button>
          <Button type="submit" size="lg" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {pending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}
