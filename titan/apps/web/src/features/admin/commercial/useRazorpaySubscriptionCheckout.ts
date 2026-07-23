import { useState } from "react";
import type { Currency, Plan } from "@titan/platform";
import {
  createRazorpaySubscriptionCheckout,
  verifyRazorpaySubscriptionPayment,
} from "./commercialApi.js";
import {
  loadRazorpayCheckout,
  openRazorpayCheckout,
  type RazorpaySuccessResponse,
} from "./razorpayCheckout.js";

/**
 * Real recurring billing (Razorpay Subscriptions API) checkout, shared by
 * the two real places it's opened from: the DPDP Scanner paywall (first
 * unlock) and the Customer Portal's own Subscription page (first subscribe
 * to a paid plan, and reactivating a canceled/expired one — see
 * `commercialApi.ts`'s `updatePortalSubscription` doc comment for why
 * reactivation goes through here now instead of a free self-service PATCH).
 * One real, tested orchestration of create-checkout → open widget → verify,
 * rather than two independently-drifting copies of the same real-money flow.
 */
export interface UseRazorpaySubscriptionCheckout {
  submittingPlanId: string | null;
  checkoutError: string | null;
  start: (plan: Plan, currency: Currency) => void;
}

export function useRazorpaySubscriptionCheckout(
  onVerified: () => void,
): UseRazorpaySubscriptionCheckout {
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function verify(response: RazorpaySuccessResponse) {
    try {
      await verifyRazorpaySubscriptionPayment(response);
      setSubmittingPlanId(null);
      onVerified();
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Payment could not be verified. If you were charged, contact support.",
      );
      setSubmittingPlanId(null);
    }
  }

  async function start(plan: Plan, currency: Currency) {
    setCheckoutError(null);
    setSubmittingPlanId(plan.id);
    try {
      const checkout = await createRazorpaySubscriptionCheckout(plan.id, currency);
      await loadRazorpayCheckout();
      openRazorpayCheckout({
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: checkout.currency,
        subscription_id: checkout.providerSubscriptionId,
        name: "CYBERDUDEBIVASH",
        description: `${plan.name} — Titan Compliance Platform`,
        theme: { color: "#00d4ff" },
        handler: (response) => {
          void verify(response);
        },
        modal: {
          // The customer closed the widget without paying — not an error,
          // just back to an unlocked button.
          ondismiss: () => setSubmittingPlanId(null),
        },
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not start checkout. Please try again.",
      );
      setSubmittingPlanId(null);
    }
  }

  return { submittingPlanId, checkoutError, start };
}
