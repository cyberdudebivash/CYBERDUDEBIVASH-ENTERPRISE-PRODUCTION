import { createHmac } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cancelRazorpaySubscription,
  createRazorpayOrder,
  createRazorpayPlan,
  createRazorpaySubscription,
  RazorpayApiError,
  verifyRazorpaySignature,
  verifyRazorpaySubscriptionSignature,
  verifyRazorpayWebhookSignature,
} from "./razorpay.js";

/** Computed independently via Node's own `node:crypto` HMAC implementation
 * — a genuinely different code path from `razorpay.ts`'s Web Crypto
 * (`crypto.subtle`) implementation, so a passing test here proves the two
 * actually agree on Razorpay's documented algorithm, not just that the
 * function is internally consistent with itself. */
function referenceSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function referenceHmac(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

describe("verifyRazorpaySignature", () => {
  it("accepts a real, correctly-computed signature", async () => {
    const orderId = "order_Ljb7X9quASfnyU";
    const paymentId = "pay_Ljb8LOKM3aBcKX";
    const secret = "a-real-test-key-secret";
    const signature = referenceSignature(orderId, paymentId, secret);

    await expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).resolves.toBe(
      true,
    );
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const orderId = "order_Ljb7X9quASfnyU";
    const paymentId = "pay_Ljb8LOKM3aBcKX";
    const wrongSignature = referenceSignature(orderId, paymentId, "not-the-real-secret");

    await expect(
      verifyRazorpaySignature(orderId, paymentId, wrongSignature, "a-real-test-key-secret"),
    ).resolves.toBe(false);
  });

  it("rejects a signature for a different order id (can't replay one payment's proof onto another order)", async () => {
    const secret = "a-real-test-key-secret";
    const paymentId = "pay_Ljb8LOKM3aBcKX";
    const signature = referenceSignature("order_the_real_one", paymentId, secret);

    await expect(
      verifyRazorpaySignature("order_a_different_one", paymentId, signature, secret),
    ).resolves.toBe(false);
  });

  it("rejects a signature for a different payment id", async () => {
    const secret = "a-real-test-key-secret";
    const orderId = "order_Ljb7X9quASfnyU";
    const signature = referenceSignature(orderId, "pay_the_real_one", secret);

    await expect(
      verifyRazorpaySignature(orderId, "pay_a_different_one", signature, secret),
    ).resolves.toBe(false);
  });

  it("rejects a garbage/empty signature rather than throwing", async () => {
    await expect(
      verifyRazorpaySignature("order_1", "pay_1", "", "a-real-test-key-secret"),
    ).resolves.toBe(false);
    await expect(
      verifyRazorpaySignature("order_1", "pay_1", "not-hex-at-all", "a-real-test-key-secret"),
    ).resolves.toBe(false);
  });

  it("is case-sensitive (Razorpay's own signatures are lowercase hex — never normalize away a real mismatch)", async () => {
    const orderId = "order_1";
    const paymentId = "pay_1";
    const secret = "a-real-test-key-secret";
    const signature = referenceSignature(orderId, paymentId, secret);

    await expect(
      verifyRazorpaySignature(orderId, paymentId, signature.toUpperCase(), secret),
    ).resolves.toBe(false);
  });
});

describe("createRazorpayOrder", () => {
  const credentials = { keyId: "rzp_test_fake", keySecret: "fake_secret" };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends real Basic Auth (key_id:key_secret, base64) and the server-resolved amount, never a client-influenced one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "order_abc", amount: 999900, currency: "INR" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const order = await createRazorpayOrder(
      { amountPaise: 999900, currency: "INR", receipt: "org_1-starter" },
      credentials,
    );

    expect(order).toEqual({ id: "order_abc", amount: 999900, currency: "INR" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${btoa("rzp_test_fake:fake_secret")}`,
        }),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({
      amount: 999900,
      currency: "INR",
      receipt: "org_1-starter",
    });
  });

  it("throws RazorpayApiError with Razorpay's own real error description on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { description: "Authentication failed" } }), {
          status: 401,
        }),
      ),
    );

    await expect(
      createRazorpayOrder({ amountPaise: 999900, currency: "INR", receipt: "r" }, credentials),
    ).rejects.toMatchObject({
      name: "RazorpayApiError",
      status: 401,
      message: "Authentication failed",
    });
  });

  it("falls back to a generic message when the error response isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })),
    );

    await expect(
      createRazorpayOrder({ amountPaise: 999900, currency: "INR", receipt: "r" }, credentials),
    ).rejects.toBeInstanceOf(RazorpayApiError);
  });
});

describe("createRazorpayPlan", () => {
  const credentials = { keyId: "rzp_test_fake", keySecret: "fake_secret" };
  afterEach(() => vi.unstubAllGlobals());

  it("sends real Basic Auth and the plan's real item/period/interval, never a placeholder", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "plan_abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const plan = await createRazorpayPlan(
      {
        amountMinorUnits: 149900,
        currency: "USD",
        planName: "Professional",
        period: "monthly",
        interval: 1,
      },
      credentials,
    );

    expect(plan).toEqual({ id: "plan_abc" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/plans",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${btoa("rzp_test_fake:fake_secret")}`,
        }),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({
      period: "monthly",
      interval: 1,
      item: { name: "Professional", amount: 149900, currency: "USD" },
    });
  });

  it("throws RazorpayApiError with Razorpay's own real error description on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { description: "Invalid currency" } }), {
          status: 400,
        }),
      ),
    );

    await expect(
      createRazorpayPlan(
        { amountMinorUnits: 100, currency: "XYZ", planName: "x", period: "monthly", interval: 1 },
        credentials,
      ),
    ).rejects.toMatchObject({ name: "RazorpayApiError", status: 400, message: "Invalid currency" });
  });
});

describe("createRazorpaySubscription", () => {
  const credentials = { keyId: "rzp_test_fake", keySecret: "fake_secret" };
  afterEach(() => vi.unstubAllGlobals());

  it("creates a real subscription against a plan id with customer_notify on and the org id carried in notes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "sub_abc", status: "created" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const subscription = await createRazorpaySubscription(
      { planId: "plan_abc", totalCount: 120, notes: { organizationId: "org_1" } },
      credentials,
    );

    expect(subscription).toEqual({ id: "sub_abc", status: "created" });
    const [, requestInit] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({
      plan_id: "plan_abc",
      total_count: 120,
      customer_notify: 1,
      notes: { organizationId: "org_1" },
    });
  });
});

describe("cancelRazorpaySubscription", () => {
  const credentials = { keyId: "rzp_test_fake", keySecret: "fake_secret" };
  afterEach(() => vi.unstubAllGlobals());

  it("calls the real cancel endpoint for the given subscription id, ending the mandate immediately", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "sub_abc", status: "cancelled" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await cancelRazorpaySubscription("sub_abc", credentials);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.razorpay.com/v1/subscriptions/sub_abc/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    const [, requestInit] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((requestInit as RequestInit).body as string)).toEqual({
      cancel_at_cycle_end: 0,
    });
  });

  it("throws RazorpayApiError on a failed cancellation rather than silently succeeding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { description: "Subscription not found" } }), {
          status: 404,
        }),
      ),
    );

    await expect(cancelRazorpaySubscription("sub_missing", credentials)).rejects.toMatchObject({
      name: "RazorpayApiError",
      status: 404,
    });
  });
});

describe("verifyRazorpaySubscriptionSignature", () => {
  it("accepts a real, correctly-computed subscription-mode signature (payment_id|subscription_id, no order id)", async () => {
    const paymentId = "pay_Ljb8LOKM3aBcKX";
    const subscriptionId = "sub_Ljb7X9quASfnyU";
    const secret = "a-real-test-key-secret";
    const signature = referenceHmac(`${paymentId}|${subscriptionId}`, secret);

    await expect(
      verifyRazorpaySubscriptionSignature(paymentId, subscriptionId, signature, secret),
    ).resolves.toBe(true);
  });

  it("rejects an order-mode signature replayed against a subscription — the two message formats must never be interchangeable", async () => {
    const paymentId = "pay_1";
    const subscriptionId = "sub_1";
    const secret = "a-real-test-key-secret";
    // Deliberately the *order-mode* message shape (subscriptionId used in
    // the order_id position, order_id|payment_id byte order) — a real
    // subscription-mode signature is payment_id|subscription_id, the
    // opposite order, so this must never verify.
    const orderModeSignature = referenceSignature(subscriptionId, paymentId, secret);

    await expect(
      verifyRazorpaySubscriptionSignature(paymentId, subscriptionId, orderModeSignature, secret),
    ).resolves.toBe(false);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const paymentId = "pay_1";
    const subscriptionId = "sub_1";
    const wrongSignature = referenceHmac(`${paymentId}|${subscriptionId}`, "wrong-secret");

    await expect(
      verifyRazorpaySubscriptionSignature(
        paymentId,
        subscriptionId,
        wrongSignature,
        "a-real-test-key-secret",
      ),
    ).resolves.toBe(false);
  });

  it("rejects a garbage/empty signature rather than throwing", async () => {
    await expect(
      verifyRazorpaySubscriptionSignature("pay_1", "sub_1", "", "a-real-test-key-secret"),
    ).resolves.toBe(false);
  });
});

describe("verifyRazorpayWebhookSignature", () => {
  it("accepts a real signature computed over the exact raw body bytes", async () => {
    const rawBody = '{"event":"subscription.charged","payload":{"subscription":{"id":"sub_1"}}}';
    const secret = "a-real-webhook-secret";
    const signature = referenceHmac(rawBody, secret);

    await expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).resolves.toBe(true);
  });

  it("rejects a signature computed over a re-serialized (not the original raw) body", async () => {
    const rawBody = '{"event":"subscription.charged","payload":{}}';
    // A re-serialized version with different (but semantically equal)
    // whitespace/key order — the exact class of bug this function's own
    // doc comment warns against silently accepting.
    const reserialized = '{ "event": "subscription.charged", "payload": {} }';
    const secret = "a-real-webhook-secret";
    const signature = referenceHmac(reserialized, secret);

    await expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).resolves.toBe(false);
  });

  it("rejects a signature computed with the wrong webhook secret", async () => {
    const rawBody = '{"event":"subscription.charged"}';
    const wrongSignature = referenceHmac(rawBody, "not-the-real-webhook-secret");

    await expect(
      verifyRazorpayWebhookSignature(rawBody, wrongSignature, "a-real-webhook-secret"),
    ).resolves.toBe(false);
  });

  it("rejects a garbage/empty signature rather than throwing", async () => {
    await expect(verifyRazorpayWebhookSignature("{}", "", "a-real-webhook-secret")).resolves.toBe(
      false,
    );
  });
});
