/**
 * Magic-link email content — pure functions, no network I/O, so template
 * changes are testable without mocking `fetch` (see resendEmail.ts for the
 * transport that actually sends this).
 *
 * `url`/`identifier` are interpolated into HTML output, so both are
 * HTML-escaped before use (CLAUDE.md's "treat generated-output injection as
 * seriously as input injection" — this is a security product vendor's own
 * outbound email, not a throwaway internal tool). `url` is Auth.js's own
 * generated callback URL, not raw user input, but escaping it costs nothing
 * and removes any dependency on that continuing to be true. Escaping `&` to
 * `&amp;` inside an `href`/visible text is correct HTML, not a bug — it
 * round-trips to the exact original URL (including its own `&`-separated
 * query params) when any HTML parser reads the attribute or text node back.
 */

export interface MagicLinkEmailInput {
  url: string;
  expires: Date;
  identifier: string;
}

export interface MagicLinkEmailContent {
  subject: string;
  html: string;
  text: string;
}

const SUPPORT_EMAIL = "contact@cyberdudebivash.in";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formatted from the real `expires` Auth.js passes in, not a hardcoded
 * "24 hours" claim — stays correct even if the provider's `maxAge` is ever
 * changed, since the two can never drift apart. */
export function formatExpiry(expires: Date, now: Date = new Date()): string {
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return "shortly";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
}

export function buildMagicLinkEmail(input: MagicLinkEmailInput): MagicLinkEmailContent {
  const expiryText = formatExpiry(input.expires);
  const year = new Date().getFullYear();
  const escapedUrl = escapeHtml(input.url);
  const escapedIdentifier = escapeHtml(input.identifier);

  const subject = "Sign in to Titan";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${subject}</title>
<style>
  body, table, td, a { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  @media (prefers-color-scheme: dark) {
    body, .bg { background-color: #0f1117 !important; }
    .card { background-color: #181b25 !important; border-color: #2a2e3d !important; }
    .heading { color: #f3f4f6 !important; }
    .body-text { color: #cbd5e1 !important; }
    .muted { color: #9ca3af !important; }
    .notice { background-color: #1f2333 !important; border-color: #323752 !important; color: #cbd5e1 !important; }
    .divider { border-color: #2a2e3d !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <tr><td class="divider" style="padding:28px 32px;border-bottom:1px solid #eef0f3;">
          <div class="muted" style="font-size:12px;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">CYBERDUDEBIVASH&reg;</div>
          <div class="heading" style="font-size:20px;font-weight:700;color:#111827;margin-top:2px;">Titan Compliance Platform</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 class="heading" style="margin:0 0 4px;font-size:20px;color:#111827;">Sign in to Titan</h1>
          <p class="muted" style="margin:0 0 20px;font-size:13px;color:#9ca3af;">Requested for ${escapedIdentifier}</p>
          <p class="body-text" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
            Click the button below to securely sign in to your Titan account. This link can only be used once.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;" bgcolor="#4f46e5">
            <a href="${escapedUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Sign in to Titan</a>
          </td></tr></table>
          <p class="muted" style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
            Or copy and paste this link into your browser:<br/>
            <a href="${escapedUrl}" style="color:#4f46e5;word-break:break-all;">${escapedUrl}</a>
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="notice" style="margin-top:24px;background-color:#f9fafb;border:1px solid #eef0f3;border-radius:8px;">
            <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#4b5563;">
              This link expires <strong>${expiryText}</strong>.<br/>
              If you didn't request this email, you can safely ignore it — no changes will be made to your account. Never share this link or forward this email to anyone.
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="divider" style="padding:20px 32px;border-top:1px solid #eef0f3;">
          <p class="muted" style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
            Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#9ca3af;text-decoration:underline;">${SUPPORT_EMAIL}</a>
          </p>
          <p class="muted" style="margin:0;font-size:12px;color:#9ca3af;">
            &copy; ${year} CYBERDUDEBIVASH&reg; Private Limited. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Sign in to Titan

Requested for: ${input.identifier}

Click the link below to securely sign in to your Titan account. This link can only be used once.

${input.url}

This link expires ${expiryText}.

If you didn't request this email, you can safely ignore it — no changes will be made to your account. Never share this link or forward this email to anyone.

Need help? Contact ${SUPPORT_EMAIL}

(c) ${year} CYBERDUDEBIVASH(R) Private Limited. All rights reserved.
`;

  return { subject, html, text };
}
