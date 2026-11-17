import "server-only";
import { Resend } from "resend";
import { env, integrations } from "@/env";
import type { EmailContent } from "@/emails/newsletter-confirm";
import { devOutboxEnabled, fileDevEmail } from "@/server/email/dev-outbox";

let resend: Resend | null = null;

/** Email can go out: Resend is configured, or (in `next dev` only) the dev outbox stands in. */
export function canSendEmail(): boolean {
  return integrations.resend || devOutboxEnabled;
}

/**
 * Sends one transactional email through Resend (SPEC §9/§12). Without Resend in development the
 * message goes to the dev outbox instead; `link` is what the outbox files.
 */
export async function sendEmail({
  to,
  content,
  kind,
  link,
  headers,
}: {
  to: string;
  content: EmailContent;
  kind: string;
  link: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  if (!integrations.resend || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (!devOutboxEnabled) return false;
    fileDevEmail(kind, to, link);
    return true;
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    headers,
  });
  if (error) {
    console.error("[email] send failed:", error.name, error.message);
    return false;
  }
  return true;
}
