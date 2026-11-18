import { Notice } from "@/components/shared/form-bits";
import { integrations } from "@/env";

/**
 * Says so when the AI pre-check isn't running (no ANTHROPIC_API_KEY), so the owner knows why
 * members' posts are being held (SPEC §8.2 fallback, D-080). Server component.
 */
export function AiStatusBanner({ className }: { className?: string }) {
  if (integrations.anthropic) return null;
  return (
    <Notice tone="error" title="AI pre-check is off: no ANTHROPIC_API_KEY" className={className}>
      Until the key is added, the SPEC §8.2 fallback applies: threads and replies from members under 20 reputation are
      held here for review, and they can&apos;t save a new bio. Members with 20 or more post straight away.
    </Notice>
  );
}
