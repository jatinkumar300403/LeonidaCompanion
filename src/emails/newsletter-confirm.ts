import type { NewsletterList } from "@/lib/newsletter/token";

/**
 * Double opt-in email (SPEC §9). Plain HTML + text instead of React Email components, which are
 * deprecated on npm (D-055). Every interpolated value is escaped.
 */
export type EmailContent = { subject: string; html: string; text: string };

const LIST_COPY: Record<NewsletterList, { subject: string; what: string }> = {
  digest: { subject: "Confirm your weekly digest", what: "the weekly digest of top tips, threads and clips" },
  online_waitlist: {
    subject: "Confirm your spot on the Online waitlist",
    what: "one email when the first Online guides go up",
  },
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function newsletterConfirmEmail({
  siteName,
  confirmUrl,
  list,
  disclaimer,
}: {
  siteName: string;
  confirmUrl: string;
  list: NewsletterList;
  disclaimer: string;
}): EmailContent {
  const copy = LIST_COPY[list];
  const name = escapeHtml(siteName);
  const url = escapeHtml(confirmUrl);
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#fafaf7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#10121a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4de;border-radius:14px">
    <tr><td style="height:4px;background:linear-gradient(135deg,#ff3d8b 0%,#ff9f43 100%);border-radius:14px 14px 0 0"></td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 8px;font-size:14px;color:#5b6172">${name}</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Please confirm your email</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6">You asked for ${escapeHtml(copy.what)}. Confirm with the button below and you're in.</p>
      <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ff3d8b;color:#0a0b10;font-weight:600;text-decoration:none">Confirm my email</a></p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#5b6172">The link works for 7 days. If you didn't ask for this, ignore this email: nothing happens until you confirm.</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#5b6172;word-break:break-all">${url}</p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #e4e4de;font-size:12px;line-height:1.5;color:#5b6172">${escapeHtml(disclaimer)}</td></tr>
  </table>
</body>
</html>`;
  const text = [
    `${siteName}: please confirm your email`,
    "",
    `You asked for ${copy.what}. Confirm here:`,
    confirmUrl,
    "",
    "The link works for 7 days. If you didn't ask for this, ignore this email: nothing happens until you confirm.",
    "",
    disclaimer,
  ].join("\n");
  return { subject: `${copy.subject} · ${siteName}`, html, text };
}
