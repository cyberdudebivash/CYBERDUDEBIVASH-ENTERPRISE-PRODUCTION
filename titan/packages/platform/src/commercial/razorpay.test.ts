import { createHmac } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createRazorpayOrder, RazorpayApiError, verifyRazorpaySignature } from "./razorpay.js";

/** Computed independently via Node's own `node:crypto` HMAC implementation
 * — a genuinely different code path from `razorpay.ts`'s Web Crypto
 * (`crypto.subtle`) implementation, so a passing test here proves the two
 * actually agree on Razorpay's documented algorithm, not just that the
 * function is internally consistent with itself. */
function referenceSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
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
