/**
 * The safe, side-effect-free landing page `GET /api/auth/verify-confirm`
 * (router.ts) renders — see `verifyConfirmUrl.ts` for why this page exists
 * at all. Rendering it does nothing: it only reads `token`/`email`/
 * `callbackUrl` from the query string to build the real, token-consuming
 * `/api/auth/callback/email` URL as a plain `<a href>`. An automated
 * scanner prefetching this page harmlessly loads static HTML; only an
 * actual human click ever reaches the real callback.
 *
 * Pure HTML generation, no network I/O — independently testable without
 * mocking a Request, the same separation `emailTemplates.ts` already uses
 * for the email side of this same flow.
 */

export interface VerifyConfirmPageInput {
  /** The Worker's own origin (`url.origin` from the incoming request) —
   * used to build the real callback URL, never trusted from a header. */
  origin: string;
  token: string;
  email: string;
  callbackUrl: string;
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

function pageShell(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="robots" content="noindex, nofollow" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    background-color: #f4f5f7;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  .card {
    width: 100%;
    max-width: 440px;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .card__header {
    padding: 24px 32px;
    border-bottom: 1px solid #eef0f3;
  }
  .card__eyebrow {
    font-size: 12px;
    letter-spacing: 0.08em;
    color: #6b7280;
    text-transform: uppercase;
  }
  .card__brand {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin-top: 2px;
  }
  .card__body { padding: 28px 32px; }
  h1 { margin: 0 0 8px; font-size: 19px; color: #111827; }
  .subtext { margin: 0 0 20px; font-size: 13px; color: #6b7280; }
  .btn {
    display: inline-block;
    width: 100%;
    text-align: center;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    background-color: #4f46e5;
    text-decoration: none;
    border-radius: 8px;
  }
  .notice {
    margin-top: 20px;
    padding: 12px 14px;
    font-size: 12px;
    line-height: 1.6;
    color: #4b5563;
    background-color: #f9fafb;
    border: 1px solid #eef0f3;
    border-radius: 8px;
  }
  .card__footer {
    padding: 16px 32px;
    border-top: 1px solid #eef0f3;
    font-size: 12px;
    color: #9ca3af;
  }
  a.footer-link { color: #9ca3af; }
  @media (prefers-color-scheme: dark) {
    body { background-color: #0f1117; }
    .card { background-color: #181b25; border-color: #2a2e3d; }
    .card__header, .card__footer { border-color: #2a2e3d; }
    .card__brand, h1 { color: #f3f4f6; }
    .notice { background-color: #1f2333; border-color: #323752; color: #cbd5e1; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="card__header">
      <div class="card__eyebrow">CYBERDUDEBIVASH&reg;</div>
      <div class="card__brand">Titan Compliance Platform</div>
    </div>
    <div class="card__body">
      ${bodyHtml}
    </div>
    <div class="card__footer">
      Need help? Contact <a class="footer-link" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
    </div>
  </div>
</body>
</html>`;
}

export function buildVerifyConfirmPage(input: VerifyConfirmPageInput): string {
  if (!input.token) {
    return pageShell(
      `<h1>This link is incomplete</h1>
      <p class="subtext">Part of the sign-in link is missing. Go back to your email and use the "Sign in to Titan" button or link again, or request a new one.</p>`,
      "Incomplete sign-in link",
    );
  }

  const realCallback = new URL(`${input.origin}/api/auth/callback/email`);
  realCallback.searchParams.set("token", input.token);
  if (input.email) realCallback.searchParams.set("email", input.email);
  if (input.callbackUrl) realCallback.searchParams.set("callbackUrl", input.callbackUrl);

  const escapedHref = escapeHtml(realCallback.toString());
  const escapedEmail = input.email ? escapeHtml(input.email) : "";

  const body = `<h1>Confirm sign-in to Titan</h1>
      <p class="subtext">${escapedEmail ? `Signing in as ${escapedEmail}. ` : ""}This extra step protects your account from automated email-security scanners that pre-open links before you see them.</p>
      <a class="btn" href="${escapedHref}">Sign in to Titan</a>
      <div class="notice">
        This confirms it's really you, not an automated scanner. If you didn't request this sign-in, just close this page — nothing happens until you click the button above.
      </div>`;

  return pageShell(body, "Confirm sign-in to Titan");
}
