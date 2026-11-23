"use server";

import { after } from "next/server";
import { siteConfig } from "@/config/site";
import { env, integrations } from "@/env";
import { removalRequestEmail } from "@/emails/removal-request";
import { rateLimit, rateLimitMessage } from "@/lib/ratelimit/limit";
import { formatRemovalDetails, parseRemovalForm, removalFieldErrors, removalTargetId } from "@/lib/validation/removal";
import { insertRemovalRequest } from "@/server/admin/removal-requests";
import { isTestIdentity } from "@/server/admin/test-auth";
import { getSession } from "@/server/auth/session";
import { requestContext } from "@/server/auth/request";
import { verifyTurnstileForm } from "@/server/auth/turnstile";
import { sendEmail } from "@/server/email/send";
import { captureServerError } from "@/server/monitoring";

/**
 * The /dmca content-removal form (SPEC §14, D-098). Public, so it's guarded like the newsletter:
 * zod, Upstash limits per IP and per email address, then Turnstile. The request is stored as a
 * `dmca` report for the moderators' queue and emailed to ADMIN_EMAIL. Nothing is emailed to the
 * requester, so the form can't be used to send mail to someone else.
 */
export type RemovalState =
  { status: "idle" } | { status: "sent" } | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const REMOVAL_CLOSED_MESSAGE = "The removal form isn't open yet. Please use the contact page instead.";

export async function submitRemovalRequest(_prev: RemovalState, formData: FormData): Promise<RemovalState> {
  if (!integrations.supabaseAdmin) return { status: "error", message: REMOVAL_CLOSED_MESSAGE };

  const parsed = parseRemovalForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: removalFieldErrors(parsed.error),
    };
  }
  const request = parsed.data;
  const { ip, origin } = await requestContext();

  // Dev test identities (D-044/D-046) skip limits and Turnstile, like the newsletter form.
  if (!isTestIdentity(request.email)) {
    for (const check of await Promise.all([rateLimit("removalIp", ip), rateLimit("removalEmail", request.email)])) {
      if (!check.success) return { status: "error", message: rateLimitMessage(check.retryAfterSeconds) };
    }
    const turnstile = await verifyTurnstileForm(formData, ip);
    if (!turnstile.ok) return { status: "error", message: turnstile.error };
  }

  const session = await getSession();
  const targetId = removalTargetId(request, siteConfig.hosts);
  const details = formatRemovalDetails(request);
  const saved = await insertRemovalRequest({ reporterId: session?.userId ?? null, targetId, details });
  if (!saved) return { status: "error", message: "We couldn't save your request. Please try again in a minute." };

  after(async () => {
    const to = env.ADMIN_EMAIL;
    if (!to) {
      console.warn("[removal] ADMIN_EMAIL isn't set; the request is only in the Reports queue.");
      return;
    }
    const queueUrl = new URL("/admin/moderation?tab=reports", origin).toString();
    try {
      const sent = await sendEmail({
        to,
        kind: "removal",
        link: queueUrl,
        content: removalRequestEmail({ siteName: siteConfig.name, details, target: targetId, queueUrl }),
      });
      if (!sent) console.warn("[removal] email not sent (no Resend key); the request is in the Reports queue.");
    } catch (error) {
      captureServerError("removal-email", error);
    }
  });

  return { status: "sent" };
}
