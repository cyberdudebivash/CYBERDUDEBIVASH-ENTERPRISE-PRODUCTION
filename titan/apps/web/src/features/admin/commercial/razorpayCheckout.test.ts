import { beforeEach, describe, expect, it, vi } from "vitest";

const CHECKOUT_SCRIPT_SELECTOR = 'script[src="https://checkout.razorpay.com/v1/checkout.js"]';

/**
 * `loadPromise` in razorpayCheckout.ts is module-scoped, real in-flight
 * state (deliberately, so a second caller while the script is still
 * loading doesn't inject a second `<script>` tag) — `vi.resetModules()` +
 * a fresh dynamic `import()` per test is what actually isolates that state
 * between tests, rather than each test silently observing the previous
 * test's leftover promise.
 */
describe("razorpayCheckout", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.Razorpay;
    document.querySelectorAll(CHECKOUT_SCRIPT_SELECTOR).forEach((el) => el.remove());
  });

  describe("loadRazorpayCheckout", () => {
    it("resolves immediately without appending a script when window.Razorpay is already present", async () => {
      window.Razorpay = vi.fn() as unknown as Window["Razorpay"];
      const { loadRazorpayCheckout } = await import("./razorpayCheckout.js");

      await expect(loadRazorpayCheckout()).resolves.toBeUndefined();
      expect(document.querySelector(CHECKOUT_SCRIPT_SELECTOR)).toBeNull();
    });

    it("appends a real script tag pointed at Razorpay's own checkout.js and resolves once it loads", async () => {
      const { loadRazorpayCheckout } = await import("./razorpayCheckout.js");

      const promise = loadRazorpayCheckout();
      const script = document.querySelector<HTMLScriptElement>(CHECKOUT_SCRIPT_SELECTOR);
      expect(script).not.toBeNull();

      script?.dispatchEvent(new Event("load"));
      await expect(promise).resolves.toBeUndefined();
    });

    it("rejects with a real, honest error message when the script fails to load", async () => {
      const { loadRazorpayCheckout } = await import("./razorpayCheckout.js");

      const promise = loadRazorpayCheckout();
      const script = document.querySelector<HTMLScriptElement>(CHECKOUT_SCRIPT_SELECTOR);
      script?.dispatchEvent(new Event("error"));

      await expect(promise).rejects.toThrow(/could not load the razorpay checkout widget/i);
    });

    it("does not append a second script while the first load is still in flight", async () => {
      const { loadRazorpayCheckout } = await import("./razorpayCheckout.js");

      void loadRazorpayCheckout();
      void loadRazorpayCheckout();

      expect(document.querySelectorAll(CHECKOUT_SCRIPT_SELECTOR).length).toBe(1);
    });
  });

  describe("openRazorpayCheckout", () => {
    const options = {
      key: "rzp_test_fake",
      amount: 999_900,
      currency: "INR",
      subscription_id: "sub_1",
      name: "CYBERDUDEBIVASH",
      handler: () => {},
    };

    it("throws a real error rather than silently no-op-ing when the widget has not finished loading", async () => {
      const { openRazorpayCheckout } = await import("./razorpayCheckout.js");

      expect(() => openRazorpayCheckout(options)).toThrow(/not finished loading/i);
    });

    it("constructs window.Razorpay with the given options and opens it", async () => {
      const open = vi.fn();
      const RazorpayMock = vi.fn().mockImplementation(() => ({ open }));
      window.Razorpay = RazorpayMock as unknown as Window["Razorpay"];
      const { openRazorpayCheckout } = await import("./razorpayCheckout.js");

      openRazorpayCheckout(options);

      expect(RazorpayMock).toHaveBeenCalledWith(options);
      expect(open).toHaveBeenCalledTimes(1);
    });
  });
});
