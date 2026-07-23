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

/** Every currency a customer may bill a subscription in. Real settlement in
 * a currency beyond a merchant's home currency (INR here — `CORPORATE_REGISTRATION`
 * in the marketing site's own `ecosystemData.ts` has this company's real
 * Indian GST/PAN registration) requires that currency actually be enabled on
 * the underlying Razorpay account — a real account-configuration fact this
 * repository cannot see or verify, named here rather than silently assumed.
 * `resolvePricing`/`findPlanPricing` below are the one place that would need
 * to reject an unsupported currency at checkout if a given Razorpay account
 * doesn't actually have it enabled. */
export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

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

/** The smallest unit of each currency (paise/cents/pence) — Razorpay's own
 * convention, and the same "never a float for money" discipline this avoids
 * by construction, for every currency this catalog prices in, not just INR. */
export type PlanPricing = Partial<Record<Currency, number>>;

export interface Plan {
  id: PlanId;
  name: string;
  /** Ordering for upgrade/downgrade comparison — higher is a strictly
   * larger plan. A plain integer, not a separate named tier enum: nothing
   * else in this system needs to reason about tiers except "is this plan
   * bigger or smaller than that one". */
  tier: number;
  priceDisplay: string;
  /** The real, chargeable amount per supported currency — server-resolved
   * for every real Razorpay order/subscription (`router.ts` never trusts a
   * client-submitted amount, only a client-chosen `Currency`). `null` for a
   * sales-assisted plan (`trialDays: 0`) — there is no self-service checkout
   * to charge a fixed amount for in any currency; a real Enterprise price is
   * negotiated, not catalog-priced. INR is the one figure with any real
   * business grounding (this company's own GST-registered home currency);
   * USD mirrors what `priceDisplay` already showed customers before this
   * became a real charged amount; EUR/GBP are new, deliberately
   * clearly-flagged placeholders — real, round, defensible numbers, not
   * verified/approved pricing, the same honest status this catalog's INR
   * figure has always carried. Change here, in one place, the day real
   * pricing is decided for any currency. */
  pricing: PlanPricing | null;
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
    pricing: {
      // ₹9,999/month — a real, round INR figure chosen for this catalog
      // (COM-1): a reasonable, clearly documented placeholder business
      // decision, not verified/approved pricing.
      INR: 999_900,
      // $499/month — promoted from what `priceDisplay` already showed
      // customers (COM-1) to a real charged amount; same placeholder status.
      USD: 49_900,
      // EUR/GBP: new placeholders added alongside real multi-currency
      // checkout — round figures in the same ballpark as the USD price
      // above, not a live FX conversion and not verified/approved pricing.
      // Update the day real regional pricing is decided.
      EUR: 45_900,
      GBP: 39_900,
    },
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
    pricing: {
      // ₹29,999/month — same reasoning as Starter's own INR figure above.
      INR: 2_999_900,
      // $1,499/month — same reasoning as Starter's own USD figure above.
      USD: 149_900,
      EUR: 139_900,
      GBP: 119_900,
    },
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
    // No self-service checkout price in any currency — see the field's own
    // doc comment.
    pricing: null,
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

/** The one place a `(plan, currency)` pair resolves to a real chargeable
 * amount — `null` whenever that combination has no real price, whether
 * because the plan is sales-assisted (`pricing: null`) or because this
 * specific currency was never priced for it (an incomplete `pricing` map).
 * `router.ts`'s order/subscription-creation routes call this instead of
 * reading `plan.pricing[currency]` directly, so "no price for this
 * currency" and "no self-service price at all" fail the exact same way at
 * every call site. */
export function findPlanPricing(plan: Plan, currency: Currency): number | null {
  return plan.pricing?.[currency] ?? null;
}
