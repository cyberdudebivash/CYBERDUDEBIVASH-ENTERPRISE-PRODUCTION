import { describe, expect, it } from "vitest";
import {
  buildCancellationEmail,
  buildExpiryEmail,
  buildPaymentReceiptEmail,
} from "./billingEmailTemplates.js";

describe("buildPaymentReceiptEmail", () => {
  const input = {
    identifier: "asha@acme.in",
    planName: "Professional",
    amountMinorUnits: 149_900,
    currency: "USD",
    currentPeriodEnd: "2026-08-23T00:00:00.000Z",
  };

  it("includes the real amount, plan, and period end in both html and text", () => {
    const email = buildPaymentReceiptEmail(input);
    expect(email.subject).toBe("Payment received — Professional plan");
    expect(email.html).toContain("$1,499.00");
    expect(email.html).toContain("Professional");
    expect(email.html).toContain("August 23, 2026");
    expect(email.text).toContain("$1,499.00");
    expect(email.text).toContain("Professional");
  });

  it("escapes an untrusted-looking identifier rather than injecting it raw", () => {
    const email = buildPaymentReceiptEmail({
      ...input,
      identifier: "<script>alert(1)</script>@acme.in",
    });
    expect(email.html).not.toContain("<script>alert(1)</script>@acme.in");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("formats a different currency correctly", () => {
    const email = buildPaymentReceiptEmail({
      ...input,
      amountMinorUnits: 999_900,
      currency: "INR",
    });
    expect(email.html).toContain("₹9,999.00");
  });
});

describe("buildCancellationEmail", () => {
  it("names the real plan and identifier, and is clear access ends immediately", () => {
    const email = buildCancellationEmail({ identifier: "asha@acme.in", planName: "Starter" });
    expect(email.subject).toBe("Your Starter subscription has been canceled");
    expect(email.html).toContain("Starter");
    expect(email.html).toContain("immediately");
    expect(email.text).toContain("Starter");
  });
});

describe("buildExpiryEmail", () => {
  it("names the real plan and distinguishes expiry from a deliberate cancellation", () => {
    const email = buildExpiryEmail({ identifier: "asha@acme.in", planName: "Professional" });
    expect(email.subject).toBe("Your Professional subscription has expired");
    expect(email.html).toContain("no active payment method");
    expect(email.html).toContain("renewed it in time");
    expect(email.text).toContain("Professional");
  });
});
