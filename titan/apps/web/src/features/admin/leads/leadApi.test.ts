import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchLeads } from "./leadApi.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

/**
 * Regression coverage for a real EAP-3 defect found while wiring EAP-4's
 * organizationId support: `searchLeads` accepted `assessmentId` on
 * `LeadSearchOptions` (EAP-3) but never actually forwarded it into the
 * request's query string, so Assessment Details' "Lead linkage" panel was
 * silently calling `GET /api/leads/search?pageSize=100` with no scoping
 * filter at all — every component test mocked `fetch` by matching on
 * `url.includes("/api/leads/search")` alone, which passes whether or not
 * the query string is actually correct. These tests assert the real URL
 * built, not just that some request happened.
 */
describe("searchLeads", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ leads: [], total: 0, page: 1, pageSize: 25 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards assessmentId in the query string", async () => {
    await searchLeads({ assessmentId: "assessment_1", pageSize: 100 });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("assessmentId=assessment_1");
  });

  it("forwards organizationId in the query string", async () => {
    await searchLeads({ organizationId: "org_1", pageSize: 100 });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("organizationId=org_1");
  });

  it("omits assessmentId/organizationId from the query string when not provided", async () => {
    await searchLeads({ pageSize: 100 });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).not.toContain("assessmentId");
    expect(requestedUrl).not.toContain("organizationId");
  });
});
