/**
 * COM-1: the Commercial Platform's plan catalog — a real, versioned, typed
 * list, but deliberately code-defined rather than a database table, the
 * same reasoning `@titan/assessment-core`'s `dpdpV1` question bank already
 * established for content that ships with the app rather than being
 * authored at runtime through an admin UI. Nothing in this brief asks for
 * dynamic plan authoring (creating a fourth tier, changing an existing
 * tier's price), and building real plan CRUD — with the proration/
 * existing-subscriber implications a live price change would carry —
 * is out of scope for a provider-agnostic platform with no real payment
 * gateway behind it. `priceDisplay` is exactly that: display text, never a
 * chargeable amount a real billing provider would process.
 */

export const PLAN_IDS = ["starter", "professional", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanEntitlements {
  /** Mirrors the Customer Portal's own real capability (CPP-1's
   * `GET /api/portal/reports/export`) — not enforced as a gate on that
   * route this phase (see `DECISION_LOG.md`'s COM-1 entry for why), but a
   * real, displayed fact about what a plan includes. */
  complianceReportExport: boolean;
  /** Mirrors the Customer Portal's own real capability (CPP-1's
   * `POST /api/portal/support`) — same non-enforcement note as above. */
  supportRequests: boolean;
  /** Informational only — there is no real support-ticket priority
   * concept anywhere in this codebase (`SupportRequestRecord` has no
   * priority field); this reflects what the plan promises, not a system
   * that currently acts on it. */
  prioritySupport: boolean;
  /** The organization's seat limit under this plan — what a new
   * `LicenseRecord.seatLimit` is initialized from on subscribe/upgrade/
   * downgrade. */
  maxSeats: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  /** Ordering for upgrade/downgrade comparison — higher is a strictly
   * larger plan. A plain integer, not a separate named tier enum: nothing
   * else in this system needs to reason about tiers except "is this plan
   * bigger or smaller than that one". */
  tier: number;
  priceDisplay: string;
  /** 0 means no self-service trial — see `PLAN_IDS`' own "enterprise" entry
   * and `router.ts`'s `createPortalSubscription`: a plan with no trial is
   * sales-assisted, not self-service-subscribable through the portal. */
  trialDays: number;
  entitlements: PlanEntitlements;
}

export const PLAN_CATALOG: readonly Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tier: 1,
    priceDisplay: "$499/month",
    trialDays: 14,
    entitlements: {
      complianceReportExport: false,
      supportRequests: true,
      prioritySupport: false,
      maxSeats: 10,
    },
  },
  {
    id: "professional",
    name: "Professional",
    tier: 2,
    priceDisplay: "$1,499/month",
    trialDays: 14,
    entitlements: {
      complianceReportExport: true,
      supportRequests: true,
      prioritySupport: false,
      maxSeats: 50,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tier: 3,
    priceDisplay: "Contact sales",
    trialDays: 0,
    entitlements: {
      complianceReportExport: true,
      supportRequests: true,
      prioritySupport: true,
      maxSeats: 250,
    },
  },
];

export function findPlan(planId: string): Plan | null {
  return PLAN_CATALOG.find((plan) => plan.id === planId) ?? null;
}

export function isSelfServicePlan(plan: Plan): boolean {
  return plan.trialDays > 0;
}
