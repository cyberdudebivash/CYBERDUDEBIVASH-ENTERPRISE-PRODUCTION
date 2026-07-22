import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "./entitlements.js";
import { findPlan } from "./planCatalog.js";

const professional = findPlan("professional")!;

describe("resolveEntitlements", () => {
  it("grants the full plan for an active subscription", () => {
    expect(resolveEntitlements(professional, { status: "active" })).toEqual(
      professional.entitlements,
    );
  });

  it("grants the full plan during a trial — a trial is full-featured, not crippled", () => {
    expect(resolveEntitlements(professional, { status: "trialing" })).toEqual(
      professional.entitlements,
    );
  });

  it("collapses every entitlement once canceled", () => {
    const result = resolveEntitlements(professional, { status: "canceled" });
    expect(result.complianceReportExport).toBe(false);
    expect(result.supportRequests).toBe(false);
    expect(result.prioritySupport).toBe(false);
    expect(result.maxSeats).toBe(0);
  });

  it("collapses every entitlement once expired", () => {
    const result = resolveEntitlements(professional, { status: "expired" });
    expect(result.maxSeats).toBe(0);
  });
});
