import { beforeEach, describe, expect, it } from "vitest";
import { isValidEmail, readLeads, submitLead } from "./leadStore.js";
import type { LeadRecord } from "./leadStore.js";

const sampleResult: LeadRecord["result"] = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 1, high: 0, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: sampleResult,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    ...overrides,
  };
}

describe("leadStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing has been stored", () => {
    expect(readLeads()).toEqual([]);
  });

  it("persists a submitted lead so it can be read back", async () => {
    await submitLead(makeLead());
    expect(readLeads()).toEqual([makeLead()]);
  });

  it("appends rather than overwriting on repeated submissions", async () => {
    await submitLead(makeLead({ email: "first@acme.in" }));
    await submitLead(makeLead({ email: "second@acme.in" }));
    expect(readLeads().map((l) => l.email)).toEqual(["first@acme.in", "second@acme.in"]);
  });

  it("does not throw and falls back to empty on corrupted storage", () => {
    window.localStorage.setItem("dpdp_leads", "{not json");
    expect(readLeads()).toEqual([]);
  });
});

describe("isValidEmail", () => {
  it.each(["asha@acme.in", "a.b+tag@sub.example.co", "x@y.co"])("accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  // "@." is the exact string the original scanner's `includes("@") && includes(".")`
  // check accepted (Discovery finding, ARCHITECTURE.md) — pinned here so the fix
  // can't silently regress back to that check.
  it.each(["@.", "not-an-email", "missing-at.com", "no-domain@", "@no-local.com", ""])(
    "rejects %s",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});
