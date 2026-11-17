"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useUnsavedGuard } from "@/components/admin/editor-fields";
import { Notice } from "@/components/shared/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LaunchFacts } from "@/lib/validation/launch-facts";
import { saveLaunchFacts, type LaunchFactsResult } from "@/server/settings/actions";

/**
 * /admin/launch (SPEC §4/§10): edits site_settings.launch_facts. Every item needs its official
 * source link; the release time, once set, replaces the local-midnight countdown (D-020).
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Labeled({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function LaunchFactsEditor({ initial }: { initial: LaunchFacts }) {
  const [facts, setFacts] = useState<LaunchFacts>(initial);
  const [releaseLocal, setReleaseLocal] = useState(toLocalInput(initial.release_at));
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<LaunchFactsResult | null>(null);
  const [pending, startTransition] = useTransition();
  useUnsavedGuard(dirty);

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const errorFor = (prefix: string) =>
    Object.entries(errors).find(([key]) => key === prefix || key.startsWith(`${prefix}.`))?.[1];

  const change = (patch: Partial<LaunchFacts>) => {
    setDirty(true);
    setFacts((current) => ({ ...current, ...patch }));
  };

  function save() {
    const release = releaseLocal ? new Date(releaseLocal) : null;
    const payload = {
      ...facts,
      release_at: release && !Number.isNaN(release.getTime()) ? release.toISOString() : null,
    };
    startTransition(async () => {
      const res = await saveLaunchFacts(payload);
      setResult(res);
      if (res.ok) {
        setDirty(false);
        setFacts(res.facts);
        toast.success(res.message);
      } else toast.error(res.message);
    });
  }

  return (
    <form
      className="flex flex-col gap-5 pb-24 sm:pb-0"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      noValidate
    >
      {result && !result.ok ? <Notice tone="error">{result.message}</Notice> : null}

      <Section title="Release" description="The official release time. Leave empty to count down to local midnight.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled id="release-at" label="Release time (your local time)">
            <Input
              id="release-at"
              type="datetime-local"
              value={releaseLocal}
              onChange={(event) => {
                setDirty(true);
                setReleaseLocal(event.target.value);
              }}
            />
          </Labeled>
          <Labeled id="release-source" label="Source link">
            <Input
              id="release-source"
              type="url"
              placeholder="https://"
              value={facts.release_source_url}
              onChange={(event) => change({ release_source_url: event.target.value })}
              aria-invalid={errorFor("release_source_url") ? true : undefined}
            />
          </Labeled>
        </div>
        <Labeled id="release-note" label="Note (optional)">
          <Input
            id="release-note"
            value={facts.release_note}
            maxLength={200}
            onChange={(event) => change({ release_note: event.target.value })}
          />
        </Labeled>
        {errorFor("release_source_url") ? (
          <p className="text-sm text-destructive">{errorFor("release_source_url")}</p>
        ) : null}
      </Section>

      <Section title="Platforms">
        {facts.platforms.map((platform, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
            <Input
              aria-label={`Platform ${index + 1} name`}
              placeholder="PS5"
              value={platform.name}
              onChange={(event) =>
                change({
                  platforms: facts.platforms.map((p, i) => (i === index ? { ...p, name: event.target.value } : p)),
                })
              }
            />
            <Input
              aria-label={`Platform ${index + 1} source link`}
              type="url"
              placeholder="https://"
              value={platform.source_url}
              onChange={(event) =>
                change({
                  platforms: facts.platforms.map((p, i) =>
                    i === index ? { ...p, source_url: event.target.value } : p,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove platform ${index + 1}`}
              onClick={() => change({ platforms: facts.platforms.filter((_, i) => i !== index) })}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {errorFor("platforms") ? <p className="text-sm text-destructive">{errorFor("platforms")}</p> : null}
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() => change({ platforms: [...facts.platforms, { name: "", source_url: "" }] })}
        >
          <Plus aria-hidden="true" />
          Add platform
        </Button>
      </Section>

      <Section title="Editions">
        {facts.editions.map((edition, index) => {
          const set = (patch: Partial<typeof edition>) =>
            change({ editions: facts.editions.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
          return (
            <div key={index} className="flex flex-col gap-2 rounded-xl border bg-surface p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <Input
                  aria-label={`Edition ${index + 1} name`}
                  placeholder="Standard Edition"
                  value={edition.name}
                  onChange={(event) => set({ name: event.target.value })}
                />
                <Input
                  aria-label={`Edition ${index + 1} price`}
                  placeholder="$69.99"
                  value={edition.price}
                  onChange={(event) => set({ price: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove edition ${index + 1}`}
                  onClick={() => change({ editions: facts.editions.filter((_, i) => i !== index) })}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                aria-label={`Edition ${index + 1} contents`}
                placeholder="What's included (optional)"
                rows={2}
                value={edition.contents}
                onChange={(event) => set({ contents: event.target.value })}
              />
              <Input
                aria-label={`Edition ${index + 1} source link`}
                type="url"
                placeholder="https://"
                value={edition.source_url}
                onChange={(event) => set({ source_url: event.target.value })}
              />
            </div>
          );
        })}
        {errorFor("editions") ? <p className="text-sm text-destructive">{errorFor("editions")}</p> : null}
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() =>
            change({ editions: [...facts.editions, { name: "", price: "", contents: "", source_url: "" }] })
          }
        >
          <Plus aria-hidden="true" />
          Add edition
        </Button>
      </Section>

      <Section title="Preload">
        {facts.preload ? (
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label="Preload details"
              rows={2}
              value={facts.preload.text}
              onChange={(event) => change({ preload: { ...facts.preload!, text: event.target.value } })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Preload starts"
                placeholder="e.g. 17 Nov, 00:00 local"
                value={facts.preload.starts_at}
                onChange={(event) => change({ preload: { ...facts.preload!, starts_at: event.target.value } })}
              />
              <Input
                aria-label="Preload source link"
                type="url"
                placeholder="https://"
                value={facts.preload.source_url}
                onChange={(event) => change({ preload: { ...facts.preload!, source_url: event.target.value } })}
              />
            </div>
            {errorFor("preload") ? <p className="text-sm text-destructive">{errorFor("preload")}</p> : null}
            <Button type="button" variant="ghost" className="w-fit" onClick={() => change({ preload: null })}>
              Remove preload info
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => change({ preload: { text: "", starts_at: "", source_url: "" } })}
          >
            <Plus aria-hidden="true" />
            Add preload info
          </Button>
        )}
      </Section>

      <Section title="Download size">
        {facts.download_size ? (
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
            <Input
              aria-label="Download size"
              placeholder="e.g. 150 GB"
              value={facts.download_size.value}
              onChange={(event) => change({ download_size: { ...facts.download_size!, value: event.target.value } })}
            />
            <Input
              aria-label="Download size source link"
              type="url"
              placeholder="https://"
              value={facts.download_size.source_url}
              onChange={(event) =>
                change({ download_size: { ...facts.download_size!, source_url: event.target.value } })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove download size"
              onClick={() => change({ download_size: null })}
            >
              <Trash2 aria-hidden="true" />
            </Button>
            {errorFor("download_size") ? (
              <p className="text-sm text-destructive sm:col-span-3">{errorFor("download_size")}</p>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => change({ download_size: { value: "", source_url: "" } })}
          >
            <Plus aria-hidden="true" />
            Add download size
          </Button>
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save launch facts"}
        </Button>
      </div>
    </form>
  );
}
