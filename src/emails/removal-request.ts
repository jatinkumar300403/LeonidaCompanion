import { escapeHtml, type EmailContent } from "@/emails/newsletter-confirm";

/**
 * "New removal request" email to the admin (SPEC §14 DMCA form, D-098). Plain HTML + text like
 * the newsletter email (D-055); every interpolated value is escaped. It carries the request
 * itself, so the admin can act from their inbox, plus a link to the Reports queue.
 */
export function removalRequestEmail({
  siteName,
  details,
  target,
  queueUrl,
}: {
  siteName: string;
  /** formatRemovalDetails() output: plain text, may contain anything the requester typed. */
  details: string;
  target: string;
  queueUrl: string;
}): EmailContent {
  const subject = `New removal request: ${target}`.slice(0, 140);
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#fafaf7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#10121a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4de;border-radius:14px">
    <tr><td style="height:4px;background:linear-gradient(135deg,#ff3d8b 0%,#ff9f43 100%);border-radius:14px 14px 0 0"></td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 8px;font-size:14px;color:#5b6172">${escapeHtml(siteName)}</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">New content removal request</h1>
      <p style="margin:0 0 12px;font-size:14px;color:#5b6172">About: ${escapeHtml(target)}</p>
      <pre style="margin:0 0 20px;padding:14px;background:#f2f2ee;border-radius:10px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escapeHtml(details)}</pre>
      <p style="margin:0"><a href="${escapeHtml(queueUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ff3d8b;color:#0a0b10;font-weight:600;text-decoration:none">Open the Reports queue</a></p>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [
    `${siteName}: new content removal request`,
    `About: ${target}`,
    "",
    details,
    "",
    `Reports queue: ${queueUrl}`,
  ].join("\n");
  return { subject, html, text };
}
