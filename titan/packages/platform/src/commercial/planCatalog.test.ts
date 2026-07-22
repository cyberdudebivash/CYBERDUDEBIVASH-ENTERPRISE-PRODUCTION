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
