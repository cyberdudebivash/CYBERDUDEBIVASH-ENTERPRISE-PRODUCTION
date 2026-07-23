import type { Answers } from "@titan/assessment-core";
import type { AssessmentRecord } from "@titan/platform";
import { getJson, postJson } from "../../../lib/apiClient.js";

/**
 * `@titan/web`'s side of the DPDP Compliance Scanner's own routes — one
 * file, the same one-file-per-feature scope `portalApi.ts`/
 * `commercialApi.ts` already establish. Real Razorpay checkout itself
 * (`createRazorpaySubscriptionCheckout`/`verifyRazorpaySubscriptionPayment`)
 * lives in `commercialApi.ts` instead, not here — it's a general Commercial
 * Platform concern `PortalSubscriptionPage` shares, not scanner-specific,
 * the same "the API module matches the backend module it calls, not the
 * page that happens to render it" reasoning `PlanCard`'s own cross-feature
 * reuse already establishes.
 */

export interface DpdpScannerAccess {
  hasAccess: boolean;
}

export function fetchDpdpScannerAccess(): Promise<DpdpScannerAccess> {
  return getJson<DpdpScannerAccess>("/api/portal/dpdp-scanner/access");
}

/** Runs and saves a real scan — the exact same `AssessmentRecord` shape the
 * pre-existing portal Assessments/Reports pages (CPP-1) already read, so a
 * scan run here needs no new results UI of its own. */
export function runDpdpScan(answers: Answers): Promise<AssessmentRecord> {
  return postJson<AssessmentRecord>("/api/portal/dpdp-scanner/scan", { answers });
}
