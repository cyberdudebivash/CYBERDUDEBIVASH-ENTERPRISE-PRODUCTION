/**
 * Razorpay's Checkout widget ships as a script tag that attaches
 * `window.Razorpay` — that's Razorpay's own documented integration, not an
 * npm package this app installs. Lazy-loaded here rather than in
 * `index.html`, so a portal visitor who never reaches the paywall never
 * fetches it — the same "load it only when actually needed" reasoning
 * `pdfReport.ts`'s own dynamic `import("jspdf")` already established.
 */

/** Real recurring billing (Razorpay Subscriptions API): subscription-mode
 * checkout's own documented success-callback shape — genuinely different
 * from one-time Orders-mode (`razorpay_subscription_id`, never
 * `razorpay_order_id` — Razorpay's Subscriptions Checkout never produces an
 * order id at all, verified directly against Razorpay's own documented
 * contract, `commercial/razorpay.ts`'s own doc comment on the backend
 * side). */
export interface RazorpaySuccessResponse {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  /** Subscription-mode checkout — opens against a real recurring mandate,
   * not a one-time order (`router.ts`'s `createRazorpaySubscriptionCheckout`
   * on the backend side). */
  subscription_id: string;
  name: string;
  description?: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(
        new Error(
          "Could not load the Razorpay checkout widget. Check your connection and try again.",
        ),
      );
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}

/** Opens the widget — `loadRazorpayCheckout()` must have already resolved,
 * same precondition `buildDpdpReportPdf`'s own lazy `jsPDF` import places on
 * its caller. */
export function openRazorpayCheckout(options: RazorpayCheckoutOptions): void {
  if (!window.Razorpay) {
    throw new Error("The Razorpay checkout widget has not finished loading yet.");
  }
  new window.Razorpay(options).open();
}
