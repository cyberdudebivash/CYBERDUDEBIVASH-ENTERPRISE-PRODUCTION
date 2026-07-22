import type { SubscriptionRecord } from "../repositories/types.js";
import type { Plan, PlanEntitlements } from "./planCatalog.js";

/** COM-1: what an organization is actually entitled to right now — a pure
 * function of `Plan.entitlements` (what the plan promises) and the
 * subscription's own current `status` (whether that promise is presently
 * in effect), never persisted as its own record. A `canceled`/`expired`
 * subscription collapses every entitlement to its "nothing" state rather
 * than continuing to grant a lapsed plan's features — `trialing` grants
 * the full plan (a trial is a real, full-featured evaluation period in
 * this model, not a crippled preview).
 *
 * Deliberately not wired as an enforcement gate on any existing route this
 * phase — see `DECISION_LOG.md`'s COM-1 entry. This is real, computed,
 * displayed information (what the Commercial Dashboard shows), not yet a
 * check any other endpoint calls before acting.
 */
export function resolveEntitlements(
  plan: Plan,
  subscription: Pick<SubscriptionRecord, "status">,
): PlanEntitlements {
  if (subscription.status === "canceled" || subscription.status === "expired") {
    return {
      complianceReportExport: false,
      supportRequests: false,
      prioritySupport: false,
      maxSeats: 0,
    };
  }
  return plan.entitlements;
}
