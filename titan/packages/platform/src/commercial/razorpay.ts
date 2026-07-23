/**
 * Real Razorpay integration — order creation against Razorpay's own REST
 * API (`fetch`, native to Workers, no SDK dependency of unknown Workers
 * compatibility) and server-side HMAC-SHA256 checkout-signature
 * verification (Web Crypto API's `crypto.subtle`, available natively in
 * both Workers and Node, so this is testable with real cryptography
 * without any Node-specific `node:crypto` compat flag).
 *
 * This project has never had real Razorpay credentials in any environment
 * it has run in — `createRazorpayOrder` genuinely calls the real Razorpay
 * API and will fail without a real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`
 * pair, the same "real but blocked without real credentials" shape PRD-1
 * already established for Cloudflare deployment. `verifyRazorpaySignature`
 * is pure, deterministic cryptography and *is* fully real-tested — see its
 * own test file for real HMAC test vectors, not mocked crypto.
 */

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
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
