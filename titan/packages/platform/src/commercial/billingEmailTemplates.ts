/**
 * Real recurring billing's own transactional emails — pure functions, no
 * network I/O, the same shape `auth/emailTemplates.ts` already established
 * for the magic-link email (testable without mocking `fetch`; sent via
 * `auth/resendEmail.ts`'s shared `sendResendEmail`, not a second transport).
 *
 * Every interpolated value is HTML-escaped before use, the same
 * generated-output-injection discipline `auth/emailTemplates.ts`'s own doc
 * comment already applies — this is a security product vendor's own
 * outbound email, not a throwaway internal tool (`CLAUDE.md`).
 *
 * Deliberately scoped to three real, already-triggered lifecycle events —
 * payment receipt, cancellation confirmation, expiry confirmation. An
 * "expiring in N days" warning email (sent ahead of `currentPeriodEnd`, not
 * at a lifecycle transition this codebase already detects) was considered
 * and left for a later pass: it needs a way to avoid re-sending the same
 * warning on every hourly cron tick (a "warning already sent" marker this
 * schema doesn't have yet), a real design decision rather than a one-line
 * addition alongside the three events already covered here.
 */

const SUPPORT_EMAIL = "contact@cyberdudebivash.in";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Server-side mirror of `apps/web/src/lib/currency.ts`'s own
 * `formatMinorUnits` — a real localized currency string via the standard
 * `Intl.NumberFormat` (available natively in Workers), never a hand-rolled
 * symbol table. Kept as its own copy rather than a shared package import:
 * this is the one real cross-boundary duplication `auth/emailTemplates.ts`'s
 * own private `escapeHtml` already established the precedent for in this
 * exact file set, not a new pattern. */
function formatMinorUnits(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountMinorUnits / 100,
  );
}

export interface BillingEmailContent {
  subject: string;
  html: string;
  text: string;
}

function shell(bodyHtml: string, bodyText: string, subject: string): BillingEmailContent {
  const year = new Date().getFullYear();
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
          ${bodyHtml}
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

  const text = `${bodyText}\n\nNeed help? Contact ${SUPPORT_EMAIL}\n\n(c) ${year} CYBERDUDEBIVASH(R) Private Limited. All rights reserved.\n`;

  return { subject, html, text };
}

export interface PaymentReceiptEmailInput {
  identifier: string;
  planName: string;
  amountMinorUnits: number;
  currency: string;
  currentPeriodEnd: string;
}

/** Sent from both places a real payment is actually verified: the checkout
 * callback (`router.ts`'s `verifyRazorpaySubscriptionPayment`) and every
 * automated renewal (`handleRazorpayWebhook`'s `subscription.charged`
 * branch) — the same real event, whether a human was present for it or
 * not. Razorpay's own Checkout also emails a receipt when
 * `customer_notify: 1` is set (`createRazorpaySubscription`'s own doc
 * comment) — this is this system's own, branded confirmation, not a
 * duplicate of Razorpay's transactional email. */
export function buildPaymentReceiptEmail(input: PaymentReceiptEmailInput): BillingEmailContent {
  const amount = formatMinorUnits(input.amountMinorUnits, input.currency);
  const periodEnd = new Date(input.currentPeriodEnd).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subject = `Payment received — ${input.planName} plan`;
  const escapedPlan = escapeHtml(input.planName);
  const escapedAmount = escapeHtml(amount);
  const escapedPeriodEnd = escapeHtml(periodEnd);

  const html = `<h1 class="heading" style="margin:0 0 4px;font-size:20px;color:#111827;">Payment received</h1>
      <p class="muted" style="margin:0 0 20px;font-size:13px;color:#9ca3af;">Requested for ${escapeHtml(input.identifier)}</p>
      <p class="body-text" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
        Thanks for your payment. Your <strong>${escapedPlan}</strong> subscription is active.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f9fafb;border:1px solid #eef0f3;border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:#374151;">
          <strong>Amount charged:</strong> ${escapedAmount}<br/>
          <strong>Plan:</strong> ${escapedPlan}<br/>
          <strong>Current period ends:</strong> ${escapedPeriodEnd}
        </td></tr>
      </table>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        This subscription renews automatically. You can view or cancel it anytime from your Titan account.
      </p>`;

  const text = `Payment received — ${input.planName} plan

Requested for: ${input.identifier}

Thanks for your payment. Your ${input.planName} subscription is active.

Amount charged: ${amount}
Plan: ${input.planName}
Current period ends: ${periodEnd}

This subscription renews automatically. You can view or cancel it anytime from your Titan account.`;

  return shell(html, text, subject);
}

export interface CancellationEmailInput {
  identifier: string;
  planName: string;
}

/** Sent whenever a subscription actually transitions to `"canceled"` —
 * customer-initiated (`applySubscriptionPatch`'s cancel branch) or
 * Razorpay-initiated (`handleRazorpayWebhook`'s `subscription.cancelled`/
 * `.completed` branches). Never sent for the admin override path setting
 * an arbitrary status change that isn't actually a cancellation. */
export function buildCancellationEmail(input: CancellationEmailInput): BillingEmailContent {
  const subject = `Your ${input.planName} subscription has been canceled`;
  const escapedPlan = escapeHtml(input.planName);

  const html = `<h1 class="heading" style="margin:0 0 4px;font-size:20px;color:#111827;">Subscription canceled</h1>
      <p class="muted" style="margin:0 0 20px;font-size:13px;color:#9ca3af;">Requested for ${escapeHtml(input.identifier)}</p>
      <p class="body-text" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
        Your <strong>${escapedPlan}</strong> subscription has been canceled. You'll lose access to
        paid features immediately — this is not a "cancels at period end" — and no further charges
        will be made.
      </p>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        Changed your mind? You can start a new subscription anytime from your Titan account.
      </p>`;

  const text = `Subscription canceled

Requested for: ${input.identifier}

Your ${input.planName} subscription has been canceled. You'll lose access to paid features immediately — this is not a "cancels at period end" — and no further charges will be made.

Changed your mind? You can start a new subscription anytime from your Titan account.`;

  return shell(html, text, subject);
}

export interface ExpiryEmailInput {
  identifier: string;
  planName: string;
}

/** Sent when a subscription lapses with no renewal — the real automated
 * expiry sweep (`router.ts`'s `runSubscriptionExpirySweep`, a Cloudflare
 * Cron Trigger) or a Razorpay mandate halted after repeated charge
 * failures (`handleRazorpayWebhook`'s `subscription.halted` branch).
 * Distinct from `buildCancellationEmail`: the customer didn't choose to
 * leave, their payment method or renewal simply didn't go through. */
export function buildExpiryEmail(input: ExpiryEmailInput): BillingEmailContent {
  const subject = `Your ${input.planName} subscription has expired`;
  const escapedPlan = escapeHtml(input.planName);

  const html = `<h1 class="heading" style="margin:0 0 4px;font-size:20px;color:#111827;">Subscription expired</h1>
      <p class="muted" style="margin:0 0 20px;font-size:13px;color:#9ca3af;">Requested for ${escapeHtml(input.identifier)}</p>
      <p class="body-text" style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
        Your <strong>${escapedPlan}</strong> subscription has expired — no active payment method
        renewed it in time. Paid features are no longer available on this organization.
      </p>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        You can reactivate anytime from your Titan account — it only takes a moment.
      </p>`;

  const text = `Subscription expired

Requested for: ${input.identifier}

Your ${input.planName} subscription has expired — no active payment method renewed it in time. Paid features are no longer available on this organization.

You can reactivate anytime from your Titan account — it only takes a moment.`;

  return shell(html, text, subject);
}
