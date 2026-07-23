/**
 * Real Razorpay integration — order/plan/subscription creation against
 * Razorpay's own REST API (`fetch`, native to Workers, no SDK dependency of
 * unknown Workers compatibility) and server-side HMAC-SHA256 signature
 * verification, both for checkout callbacks and for webhook deliveries (Web
 * Crypto API's `crypto.subtle`, available natively in both Workers and
 * Node, so this is testable with real cryptography without any
 * Node-specific `node:crypto` compat flag).
 *
 * This project has never had real Razorpay credentials in any environment
 * it has run in — every function here that calls `fetch` genuinely calls
 * the real Razorpay API and will fail without a real credential pair, the
 * same "real but blocked without real credentials" shape PRD-1 already
 * established for Cloudflare deployment, and Google/GitHub OAuth
 * (`auth/config.ts`) already established before this. Every signature
 * verification function, by contrast, is pure, deterministic cryptography
 * and *is* fully real-tested — see this file's own test file for real HMAC
 * test vectors, not mocked crypto. **The Subscriptions API surface below
 * (plans, subscriptions, subscription-mode checkout verification, webhook
 * handling) is real code against Razorpay's own documented API contract,
 * but — unlike order creation, which was verified against a real merchant
 * account before this — has never been exercised against a live Razorpay
 * account of any kind, sandbox or production, because none has ever existed
 * in this project. Treat it with the same scrutiny a first real production
 * transaction deserves.**
 */

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/** Razorpay's own Plans API models a fixed recurring price — `period`
 * matches this catalog's own billing cadence (every plan in
 * `commercial/planCatalog.ts` is monthly today; `interval: 1` means "every
 * 1 period", both real, required fields on Razorpay's documented contract,
 * not placeholders). */
export interface CreatePlanParams {
  amountMinorUnits: number;
  currency: string;
  planName: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
}

export interface RazorpayPlan {
  id: string;
}

export interface CreateSubscriptionParams {
  planId: string;
  /** Razorpay requires a finite `total_count` of billing cycles — there is
   * no "forever" value on their documented contract. A large, round number
   * (10 years of monthly cycles) is the standard, documented way every
   * real-world Razorpay Subscriptions integration models "until the
   * customer or the merchant cancels" without a literal unbounded option —
   * `applySubscriptionPatch`'s real cancel path (`commercial/razorpay.ts`'s
   * `cancelRazorpaySubscription`, wired in `router.ts`) is what actually
   * ends billing, not this number running out under ordinary use. */
  totalCount: number;
  /** Razorpay's own free-text metadata field, round-tripped back on every
   * webhook event for this subscription — carries this system's own
   * organization id so `router.ts`'s webhook handler never has to derive it
   * from Razorpay's own opaque id alone. */
  notes: Record<string, string>;
}

export interface RazorpaySubscription {
  id: string;
  status: string;
}

export interface CreateOrderParams {
  amountPaise: number;
  currency: string;
  receipt: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

/** Real call to `POST https://api.razorpay.com/v1/orders` — HTTP Basic Auth
 * per Razorpay's own documented API contract (`key_id:key_secret`,
 * base64-encoded). Never logs or returns `keySecret` itself. */
export async function createRazorpayOrder(
  params: CreateOrderParams,
  credentials: RazorpayCredentials,
): Promise<RazorpayOrder> {
  const authHeader = `Basic ${btoa(`${credentials.keyId}:${credentials.keySecret}`)}`;
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
    }),
  });

  if (!response.ok) {
    // Razorpay's own error responses are JSON with a `.error.description` —
    // read defensively since a network-layer failure won't be JSON at all.
    let description = `Razorpay order creation failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { description?: string } };
      if (body.error?.description) description = body.error.description;
    } catch {
      // Non-JSON error body — keep the generic message above.
    }
    throw new RazorpayApiError(description, response.status);
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return { id: order.id, amount: order.amount, currency: order.currency };
}

/** Shared by every Subscriptions-API call below — same Basic Auth, same
 * error-shape handling `createRazorpayOrder` established above, factored
 * out once a second and third real endpoint needed it rather than
 * duplicated a third time. */
async function razorpayPost<T>(
  path: string,
  body: Record<string, unknown>,
  credentials: RazorpayCredentials,
  action: string,
): Promise<T> {
  const authHeader = `Basic ${btoa(`${credentials.keyId}:${credentials.keySecret}`)}`;
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let description = `Razorpay ${action} failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { error?: { description?: string } };
      if (errorBody.error?.description) description = errorBody.error.description;
    } catch {
      // Non-JSON error body — keep the generic message above.
    }
    throw new RazorpayApiError(description, response.status);
  }

  return (await response.json()) as T;
}

/** Real call to `POST https://api.razorpay.com/v1/plans` — the fixed
 * recurring price a subscription is created against. Razorpay has no
 * "find or reuse an existing plan" endpoint on its documented contract, so
 * this is called fresh per new subscription (accepted, bounded API-call
 * cost) rather than built around a caching layer this scope doesn't need. */
export async function createRazorpayPlan(
  params: CreatePlanParams,
  credentials: RazorpayCredentials,
): Promise<RazorpayPlan> {
  const plan = await razorpayPost<{ id: string }>(
    "/plans",
    {
      period: params.period,
      interval: params.interval,
      item: {
        name: params.planName,
        amount: params.amountMinorUnits,
        currency: params.currency,
      },
    },
    credentials,
    "plan creation",
  );
  return { id: plan.id };
}

/** Real call to `POST https://api.razorpay.com/v1/subscriptions` — creates
 * the actual recurring mandate a customer authorizes at checkout
 * (`customer_notify: 1` so Razorpay itself emails the customer a real
 * receipt/confirmation on every charge, independent of and in addition to
 * this system's own `commercial/billingEmailTemplates.ts`). */
export async function createRazorpaySubscription(
  params: CreateSubscriptionParams,
  credentials: RazorpayCredentials,
): Promise<RazorpaySubscription> {
  const subscription = await razorpayPost<{ id: string; status: string }>(
    "/subscriptions",
    {
      plan_id: params.planId,
      total_count: params.totalCount,
      customer_notify: 1,
      notes: params.notes,
    },
    credentials,
    "subscription creation",
  );
  return { id: subscription.id, status: subscription.status };
}

/** Real call to `POST https://api.razorpay.com/v1/subscriptions/:id/cancel`
 * — the one call that actually stops future auto-charges. Called from
 * `router.ts` whenever a customer (or a Platform Administrator) cancels a
 * subscription that has a real `providerSubscriptionId`; flipping this
 * system's own `status` to `"canceled"` without also calling this would
 * leave Razorpay's own mandate active and still auto-charging the customer
 * every period, silently contradicting what the product shows them.
 * `cancelAtCycleEnd: false` (Razorpay's own `cancel_at_cycle_end: 0`) ends
 * the mandate immediately, matching this system's own cancel semantics
 * elsewhere (`applySubscriptionPatch` revokes access immediately on
 * cancellation, never at a future period end). */
export async function cancelRazorpaySubscription(
  providerSubscriptionId: string,
  credentials: RazorpayCredentials,
): Promise<void> {
  await razorpayPost(
    `/subscriptions/${providerSubscriptionId}/cancel`,
    { cancel_at_cycle_end: 0 },
    credentials,
    "subscription cancellation",
  );
}

/** Razorpay's own documented checkout-verification algorithm:
 * `hmac_sha256(order_id + "|" + payment_id, key_secret)` must equal the
 * `razorpay_signature` the checkout widget returns. Computed with the Web
 * Crypto API, compared with a constant-time comparison (`timingSafeEqual`
 * below) rather than `===`, so a payment can never be forged by an
 * attacker who can only observe response timing. */
export async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, keySecret);
  return timingSafeEqual(expected, signature);
}

/** Razorpay's own documented Subscriptions-mode checkout-verification
 * algorithm — genuinely different from Orders-mode above, not a copy of it:
 * `hmac_sha256(payment_id + "|" + subscription_id, key_secret)`, no order id
 * anywhere in the message, because subscription-mode checkout never
 * produces one (`BillingTransactionRecord.providerOrderId`'s own comment).
 * Same constant-time comparison, same reasoning. */
export async function verifyRazorpaySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  keySecret: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(`${paymentId}|${subscriptionId}`, keySecret);
  return timingSafeEqual(expected, signature);
}

/** Razorpay's own documented webhook-verification algorithm:
 * `hmac_sha256(<raw request body>, webhook_secret)` must equal the
 * `X-Razorpay-Signature` header — a *different* secret from
 * `RazorpayCredentials.keySecret` (Razorpay issues a dedicated webhook
 * secret when a webhook endpoint is configured in the dashboard), and
 * verified over the exact raw bytes of the body, never a re-serialized
 * `JSON.stringify` of a parsed object — Razorpay's own signature is
 * computed over what it actually sent, and re-serializing can silently
 * produce different bytes (key order, whitespace) even when the parsed
 * value is "the same". `router.ts`'s webhook route reads `request.text()`
 * once and passes that same raw string here before ever calling
 * `JSON.parse` on it. */
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(rawBody, webhookSecret);
  return timingSafeEqual(expected, signature);
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signatureBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A length-leaking `===` comparison on a signature is a real timing-attack
 * surface (the standard reasoning behind `crypto.timingSafeEqual` in every
 * language's stdlib) — this compares every character regardless of where
 * the first mismatch occurs, only short-circuiting on length (an
 * unavoidable, non-secret-dependent leak every constant-time compare
 * accepts). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
