import { describe, expect, it } from "vitest";
import { findPlan, isSelfServicePlan, PLAN_CATALOG, PLAN_IDS } from "./planCatalog.js";

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

  it("gives every self-service plan a real, positive priceInPaise, and the sales-assisted plan null", () => {
    for (const plan of PLAN_CATALOG) {
      if (isSelfServicePlan(plan)) {
        expect(plan.priceInPaise).not.toBeNull();
        expect(plan.priceInPaise).toBeGreaterThan(0);
      } else {
        expect(plan.priceInPaise).toBeNull();
      }
    }
  });

  it("orders priceInPaise strictly by ascending tier, for every self-service plan", () => {
    const selfServicePlans = PLAN_CATALOG.filter(isSelfServicePlan).sort((a, b) => a.tier - b.tier);
    for (let i = 1; i < selfServicePlans.length; i += 1) {
      expect(selfServicePlans[i]!.priceInPaise!).toBeGreaterThan(
        selfServicePlans[i - 1]!.priceInPaise!,
      );
    }
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
