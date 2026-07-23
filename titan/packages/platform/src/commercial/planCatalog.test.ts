import { describe, expect, it } from "vitest";
import {
  findPlan,
  findPlanPricing,
  isSelfServicePlan,
  isSupportedCurrency,
  PLAN_CATALOG,
  PLAN_IDS,
  SUPPORTED_CURRENCIES,
} from "./planCatalog.js";

describe("PLAN_CATALOG", () => {
  it("has one real entry per PLAN_IDS value, no more, no fewer", () => {
    expect(PLAN_CATALOG.map((plan) => plan.id).sort()).toEqual([...PLAN_IDS].sort());
  });

  it("orders tiers strictly by ascending size", () => {
    const tiers = PLAN_CATALOG.map((plan) => plan.tier);
    expect(new Set(tiers).size).toBe(tiers.length);
    expect([...tiers].sort((a, b) => a - b)).toEqual(
      [...PLAN_CATALOG].sort((a, b) => a.tier - b.tier).map((plan) => plan.tier),
    );
  });

  it("gives every plan a real positive seat limit", () => {
    for (const plan of PLAN_CATALOG) {
      expect(plan.entitlements.maxSeats).toBeGreaterThan(0);
    }
  });

  it("gives every self-service plan a real, positive price in every supported currency, and the sales-assisted plan none", () => {
    for (const plan of PLAN_CATALOG) {
      if (isSelfServicePlan(plan)) {
        expect(plan.pricing).not.toBeNull();
        for (const currency of SUPPORTED_CURRENCIES) {
          const amount = findPlanPricing(plan, currency);
          expect(amount).not.toBeNull();
          expect(amount!).toBeGreaterThan(0);
        }
      } else {
        expect(plan.pricing).toBeNull();
      }
    }
  });

  it("orders pricing strictly by ascending tier, for every self-service plan, in every supported currency", () => {
    const selfServicePlans = PLAN_CATALOG.filter(isSelfServicePlan).sort((a, b) => a.tier - b.tier);
    for (const currency of SUPPORTED_CURRENCIES) {
      for (let i = 1; i < selfServicePlans.length; i += 1) {
        expect(findPlanPricing(selfServicePlans[i]!, currency)!).toBeGreaterThan(
          findPlanPricing(selfServicePlans[i - 1]!, currency)!,
        );
      }
    }
  });
});

describe("findPlanPricing", () => {
  it("resolves a real amount for a self-service plan in a supported currency", () => {
    expect(findPlanPricing(findPlan("starter")!, "USD")).toBe(49_900);
  });

  it("returns null for the sales-assisted plan in any currency", () => {
    expect(findPlanPricing(findPlan("enterprise")!, "INR")).toBeNull();
  });
});

describe("isSupportedCurrency", () => {
  it("is true for every real supported currency", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(isSupportedCurrency(currency)).toBe(true);
    }
  });

  it("is false for an unsupported or malformed currency code", () => {
    expect(isSupportedCurrency("JPY")).toBe(false);
    expect(isSupportedCurrency("not-a-currency")).toBe(false);
  });
});

describe("findPlan", () => {
  it("finds a real plan by id", () => {
    expect(findPlan("starter")?.name).toBe("Starter");
  });

  it("returns null for an unknown plan id", () => {
    expect(findPlan("does-not-exist")).toBeNull();
  });
});

describe("isSelfServicePlan", () => {
  it("is true for a plan with a real trial period", () => {
    expect(isSelfServicePlan(findPlan("starter")!)).toBe(true);
  });

  it("is false for the sales-assisted enterprise plan", () => {
    expect(isSelfServicePlan(findPlan("enterprise")!)).toBe(false);
  });
});
