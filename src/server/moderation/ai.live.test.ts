import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ModerationAction, ModerationKind, ModerationLabel } from "@/lib/moderation/labels";

/**
 * Owner-run live check of the AI pre-check (PROGRESS "Owner to-dos from Phase 6"). Skipped unless
 * MODERATION_LIVE=1 and ANTHROPIC_API_KEY is set, so `pnpm test` stays offline and free.
 *   PowerShell:  $env:MODERATION_LIVE="1"; pnpm vitest run src/server/moderation/ai.live.test.ts
 * One real call per SPEC §8.2 label (well under a cent in total with Haiku 5.5). Each must parse as
 * strict JSON (no fallback), answer inside the 4 s timeout, and carry the expected label.
 * The samples are made-up test inputs, not claims about the game.
 */
const envFile = join(process.cwd(), ".env.local");
if (process.env.MODERATION_LIVE === "1" && existsSync(envFile)) process.loadEnvFile(envFile);
const live = process.env.MODERATION_LIVE === "1" && Boolean(process.env.ANTHROPIC_API_KEY);

type Sample = { label: ModerationLabel | "none"; kind: ModerationKind; body: string; action: ModerationAction };

const SAMPLES: Sample[] = [
  { label: "none", kind: "post", body: "What's the best camera speed setting for driving at night?", action: "allow" },
  {
    label: "spam",
    kind: "post",
    body: "BUY CHEAP GTA COINS NOW!!! Best prices, 50% off today only, message me on WhatsApp for the link!!!",
    action: "reject",
  },
  {
    label: "harassment",
    kind: "post",
    body: "@sam you're a pathetic idiot, nobody wants you here. Quit the forum or I'll make your life hell.",
    action: "hold",
  },
  {
    label: "hate",
    kind: "post",
    body: "People of that religion are subhuman vermin and shouldn't be allowed to play games at all.",
    action: "reject",
  },
  {
    label: "sexual",
    kind: "post",
    body: "DM me for nude pics and sexting, I'll send explicit videos to anyone who adds me ;)",
    action: "reject",
  },
  {
    label: "self_harm",
    kind: "post",
    body: "Honestly I don't see the point any more. I've been thinking about ending my life this weekend.",
    action: "hold",
  },
  {
    label: "doxxing",
    kind: "post",
    body: "Found the guy who beat me online: Sam Carter, 42 Elm Street, Springfield, phone 555-0134. Go visit him.",
    action: "reject",
  },
  {
    label: "cheating_or_exploit",
    kind: "thread",
    body: "Step-by-step guide to the online money duplication glitch, plus a mod menu download that stays undetected.",
    action: "hold",
  },
  {
    label: "leak",
    kind: "thread",
    body: "Datamined from the stolen dev build: here's the full list of unreleased DLC missions and leaked footage.",
    action: "hold",
  },
  {
    label: "untagged_spoiler",
    kind: "post",
    body: "Can't believe how it ends: in the very last story mission your partner betrays you and dies.",
    // Sent back to be tagged (D-079).
    action: "reject",
  },
  {
    label: "off_topic",
    kind: "post",
    body: "Anyone have a good banana bread recipe? Mine always comes out dry.",
    action: "allow",
  },
];

describe.skipIf(!live)("live AI pre-check (owner-run, makes real API calls)", () => {
  it.each(SAMPLES)("$label", { timeout: 15_000 }, async (sample) => {
    const { classifyContent, MODERATION_TIMEOUT_MS } = await import("./ai");
    const { fastModel, getAnthropic } = await import("@/server/ai/client");
    const result = await classifyContent(
      { kind: sample.kind, body: sample.body, spoilerTagged: false },
      { client: getAnthropic(), model: fastModel(), reputation: 0 },
    );
    console.info(`[live] ${sample.label}: ${result.action} [${result.labels.join(", ")}] ${result.latencyMs} ms`);
    expect(result.fallback, "strict JSON answer within the timeout").toBeNull();
    expect(result.source).toBe("ai");
    expect(result.latencyMs).toBeLessThan(MODERATION_TIMEOUT_MS);
    if (sample.label !== "none") expect(result.labels).toContain(sample.label);
    expect(result.action).toBe(sample.action);
  });
});
