import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchLeads, isValidEmail, submitLead } from "./leadStore.js";
import type { LeadRecord, NewLead } from "./leadStore.js";

const sampleResult: NewLead["result"] = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 1, high: 0, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeLead(overrides: Partial<NewLead> = {}): NewLead {
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

/** What `fetchLeads()` actually reads back — a real, server-assigned
 * `id`/`organizationId`/`assessmentId`, not just what was submitted. */
function makeLeadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: null,
    assessmentId: null,
    ...makeLead(),
    ...overrides,
  };
}

describe("leadStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("submitLead", () => {
    it("POSTs the lead to the Worker's /api/leads endpoint", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "lead_1", ...makeLead() }), { status: 201 }),
      );

      await submitLead(makeLead());

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0]!;
      expect(String(url)).toContain("/api/leads");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toMatchObject({ email: "asha@acme.in" });
    });

    it("throws an ApiError with the server's message when the request is rejected", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Missing or invalid field: email" } }), {
          status: 400,
        }),
      );

      await expect(submitLead(makeLead())).rejects.toMatchObject({
        message: "Missing or invalid field: email",
      });
    });

    it("throws a genuine ApiError instance, not a plain Error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 500 }));
      await expect(submitLead(makeLead())).rejects.toBeInstanceOf(ApiError);
    });

    it("throws an ApiError distinguishing a network failure from a rejected request", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));

      await expect(submitLead(makeLead())).rejects.toThrow(/could not reach the server/i);
    });
  });

  describe("fetchLeads", () => {
    it("GETs leads from the Worker, including the server-assigned id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([makeLeadRecord()]), { status: 200 }),
      );

      const leads = await fetchLeads();

      expect(leads).toEqual([makeLeadRecord()]);
      expect(leads[0]?.id).toBe("lead_1");
      const [url, init] = vi.mocked(fetch).mock.calls[0]!;
      expect(String(url)).toContain("/api/leads");
      expect(init?.method).toBeUndefined();
    });

    it("throws a 403 ApiError for an authenticated caller who isn't a Platform Administrator", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "forbidden", message: "Platform Administrator role required" },
          }),
          { status: 403 },
        ),
      );

      await expect(fetchLeads()).rejects.toMatchObject({ status: 403 });
    });
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
