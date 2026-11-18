"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveFlags } from "@/server/settings/actions";
import type { Flags } from "@/server/flags";

/** What each flag does, in plain words (SPEC §10, D-018, D-085, D-086). */
const FLAG_INFO: { key: keyof Flags; label: string; description: string }[] = [
  {
    key: "MAINTENANCE_MODE",
    label: "Maintenance mode",
    description:
      "Pauses members' writing: threads, replies, edits, votes, clip submissions and profile text. Reading, reports and blocks keep working, and staff can still post. A banner tells visitors.",
  },
  {
    key: "SHADOW_HOLD_NEW_USERS",
    label: "Hold new accounts (spam attack)",
    description:
      "Threads, replies and bios from accounts younger than 24 hours or under 5 reputation wait in Moderation → Held, even when the AI check passes them. Their authors see “Pending review”.",
  },
  {
    key: "FEATURE_ONLINE",
    label: "Online section",
    description:
      "Opens the Online pages and unlocks the Online forum category. Off: “coming soon” and a read-only category.",
  },
  {
    key: "FEATURE_ASK_ANON",
    label: "Ask AI without an account",
    description: "Lets signed-out visitors use Ask AI (with a bot check and a daily limit). Read by Ask AI (Phase 8).",
  },
  {
    key: "FEATURE_ADS",
    label: "Ads",
    description: "Reserved: no ad slots exist yet, so this does nothing for now.",
  },
];

export function FlagsForm({ initial }: { initial: Flags }) {
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [flags, setFlags] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = (Object.keys(flags) as (keyof Flags)[]).some((key) => flags[key] !== saved[key]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveFlags(flags);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          setSaved(result.flags);
          setFlags(result.flags);
        });
      }}
    >
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {FLAG_INFO.map((flag) => (
          <li key={flag.key} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <Label htmlFor={`${id}-${flag.key}`} className="text-base font-semibold">
                {flag.label}
              </Label>
              <p id={`${id}-${flag.key}-desc`} className="mt-1 text-sm text-muted-foreground">
                {flag.description}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{flag.key}</p>
            </div>
            <Switch
              id={`${id}-${flag.key}`}
              aria-describedby={`${id}-${flag.key}-desc`}
              checked={flags[flag.key]}
              onCheckedChange={(checked) => setFlags((current) => ({ ...current, [flag.key]: checked }))}
              className="mt-1 shrink-0"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save flags"}
        </Button>
        {dirty ? <p className="text-sm text-muted-foreground">Unsaved changes.</p> : null}
      </div>
    </form>
  );
}
