import "server-only";
import { isModerationLabel, HOLD_LABELS, REJECT_LABELS, type ModerationLabel } from "@/lib/moderation/labels";
import type { ModelVerdict } from "@/lib/moderation/verdict";
import type { ModerationClient, ModerationRequest } from "@/server/moderation/ai";

/**
 * Stand-in for the Claude API in E2E tests and visual QA (follows D-044 and D-073). Under
 * `next dev`, content written by `e2e-…@example.com` users is checked by this fake client instead of
 * Anthropic, so tests need no key and spend nothing. It answers through the same parse, rules and
 * logging path as the real call. Markers in the text pick the answer:
 *   [e2e-hold:harassment]   → that label (and its SPEC action)
 *   [e2e-reject:spam]       → that label
 *   anything else           → allow, no labels
 * Production builds never use it: isTestIdentity() needs NODE_ENV=development.
 */
const MARKER = /\[e2e-(?:hold|reject):([a-z_]+)\]/g;

export function verdictFromText(text: string): ModelVerdict {
  const labels = [...text.matchAll(MARKER)].map((match) => match[1]).filter(isModerationLabel) as ModerationLabel[];
  if (labels.length === 0) return { action: "allow", labels: [], reason: "Ordinary gaming talk." };
  const action = labels.some((label) => REJECT_LABELS.has(label))
    ? "reject"
    : labels.some((label) => HOLD_LABELS.has(label))
      ? "hold"
      : "allow";
  return { action, labels, reason: `Test marker: ${labels.join(", ")}.` };
}

function requestText(params: ModerationRequest): string {
  return params.messages
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : message.content.map((block) => (block.type === "text" ? block.text : "")).join("\n"),
    )
    .join("\n");
}

export const devMockModerationClient: ModerationClient = {
  messages: {
    async parse(params) {
      return { stop_reason: "end_turn", parsed_output: verdictFromText(requestText(params)) };
    },
  },
};
