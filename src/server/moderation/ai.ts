import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  decideAction,
  fallbackDecision,
  modelVerdictSchema,
  type FallbackCause,
  type ModerationDecision,
} from "@/lib/moderation/verdict";
import { buildModerationMessage, MODERATION_SYSTEM_PROMPT, type ModerationInput } from "@/server/ai/prompts";

/**
 * The SPEC §8.2 AI pre-check: one call to the fast model (Haiku 5.5) with a strict JSON schema,
 * validated with zod. A missing key, a timeout (4 s), an unreadable answer, a refusal or an API
 * error never throws: the fallback rule applies instead (allow at reputation ≥ 20, hold below)
 * and a warning is logged. Settings follow D-011: thinking off, effort low, no retries.
 */
export const MODERATION_TIMEOUT_MS = 4_000;
const MAX_TOKENS = 400;

export type ModerationRequest = Anthropic.MessageCreateParamsNonStreaming;
export type ModerationRequestOptions = { signal?: AbortSignal; timeout?: number; maxRetries?: number };

/** The slice of the SDK client this uses, so tests and the dev mock can stand in for it. */
export type ModerationClient = {
  messages: {
    parse(
      params: ModerationRequest,
      options?: ModerationRequestOptions,
    ): PromiseLike<{ stop_reason: string | null; parsed_output: unknown }>;
  };
};

export type Classification = ModerationDecision & {
  source: "ai" | "fallback";
  fallback: FallbackCause | null;
  latencyMs: number | null;
};

const VERDICT_FORMAT = zodOutputFormat(modelVerdictSchema);

export function moderationRequest(input: ModerationInput, model: string): ModerationRequest {
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: MODERATION_SYSTEM_PROMPT,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: VERDICT_FORMAT },
    messages: [{ role: "user", content: buildModerationMessage(input) }],
  };
}

const warned = globalThis as typeof globalThis & { __moderationNoKeyWarned?: boolean };

function fallback(reputation: number, cause: FallbackCause, latencyMs: number | null, detail?: string): Classification {
  if (cause === "no_key") {
    if (!warned.__moderationNoKeyWarned) {
      warned.__moderationNoKeyWarned = true;
      console.warn(
        "[moderation] ANTHROPIC_API_KEY is empty: the AI pre-check is off. SPEC §8.2 fallback applies (members under 20 reputation are held).",
      );
    }
  } else {
    console.warn(`[moderation] AI check fell back (${cause})${detail ? `: ${detail}` : ""}`);
  }
  return { ...fallbackDecision(reputation, cause), source: "fallback", fallback: cause, latencyMs };
}

function causeOf(error: unknown, aborted: boolean): FallbackCause {
  if (aborted || error instanceof Anthropic.APIUserAbortError || error instanceof Anthropic.APIConnectionTimeoutError) {
    return "timeout";
  }
  if (error instanceof Anthropic.APIError) return "error";
  // Any other SDK error here is client-side: the structured output didn't parse or validate.
  if (error instanceof Anthropic.AnthropicError) return "parse";
  return "error";
}

export async function classifyContent(
  input: ModerationInput,
  options: { client: ModerationClient | null; model: string; reputation: number; timeoutMs?: number },
): Promise<Classification> {
  const { client, model, reputation } = options;
  if (!client) return fallback(reputation, "no_key", null);

  const timeoutMs = options.timeoutMs ?? MODERATION_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const message = await client.messages.parse(moderationRequest(input, model), {
      signal: controller.signal,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const latencyMs = Date.now() - started;
    if (message.stop_reason === "refusal") return fallback(reputation, "refusal", latencyMs);
    if (message.stop_reason === "max_tokens") return fallback(reputation, "parse", latencyMs, "hit max_tokens");

    const verdict = modelVerdictSchema.safeParse(message.parsed_output);
    if (!verdict.success) return fallback(reputation, "parse", latencyMs, "answer didn't match the schema");

    return {
      ...decideAction(verdict.data, { kind: input.kind, spoilerTagged: input.spoilerTagged }),
      source: "ai",
      fallback: null,
      latencyMs,
    };
  } catch (error) {
    const cause = causeOf(error, controller.signal.aborted);
    const detail = error instanceof Error ? error.message.split("\n")[0] : undefined;
    return fallback(reputation, cause, Date.now() - started, detail);
  } finally {
    clearTimeout(timer);
  }
}
