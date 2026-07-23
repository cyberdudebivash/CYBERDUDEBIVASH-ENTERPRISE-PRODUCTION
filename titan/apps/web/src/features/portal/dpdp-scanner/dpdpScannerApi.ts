import type { Answers } from "@titan/assessment-core";
import type { AssessmentRecord } from "@titan/platform";
import { getJson, postJson } from "../../../lib/apiClient.js";

/**
 * `@titan/web`'s side of the DPDP Compliance Scanner's real payment gate —
 * one file, the same one-file-per-feature scope `portalApi.ts`/
 * `commercialApi.ts` already establish. Every function here calls a real
 * `/api/portal/*` route (`router.ts`); nothing here computes a price or a
 * risk score itself — both are server-resolved, the same discipline
 * `createPortalSubscription` already established for plan pricing.
 */

export interface DpdpScannerAccess {
  hasAccess: boolean;
}

export function fetchDpdpScannerAccess(): Promise<DpdpScannerAccess> {
  return getJson<DpdpScannerAccess>("/api/portal/dpdp-scanner/access");
}

export interface RazorpayOrderResponse {
  orderId: string;
  amountPaise: number;
  currency: string;
  /** Razorpay's own publishable key id — safe to use client-side to open
   * Checkout (never the key secret, which never leaves the Worker). */
  keyId: string;
  transactionId: string;
}

export function createDpdpScannerOrder(planId: string): Promise<RazorpayOrderResponse> {
  return postJson<RazorpayOrderResponse>("/api/portal/commercial/razorpay/orders", { planId });
}

export interface VerifyRazorpayPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyRazorpayPaymentResponse {
  verified: boolean;
  transactionId: string;
}

export function verifyDpdpScannerPayment(
  input: VerifyRazorpayPaymentInput,
): Promise<VerifyRazorpayPaymentResponse> {
  return postJson<VerifyRazorpayPaymentResponse>("/api/portal/commercial/razorpay/verify", input);
}

/** Runs and saves a real scan — the exact same `AssessmentRecord` shape the
 * pre-existing portal Assessments/Reports pages (CPP-1) already read, so a
 * scan run here needs no new results UI of its own. */
export function runDpdpScan(answers: Answers): Promise<AssessmentRecord> {
  return postJson<AssessmentRecord>("/api/portal/dpdp-scanner/scan", { answers });
}
