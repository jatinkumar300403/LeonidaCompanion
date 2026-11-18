import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

let client: Anthropic | null = null;

/**
 * The Claude API client (D-011), or null while ANTHROPIC_API_KEY is empty. Features check for null
 * and degrade: moderation applies the SPEC §8.2 fallback rule.
 */
export function getAnthropic(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** The fast model (Haiku 5.5 by default): moderation, and Ask AI in Phase 8. */
export function fastModel(): string {
  return env.ANTHROPIC_MODEL_FAST;
}
