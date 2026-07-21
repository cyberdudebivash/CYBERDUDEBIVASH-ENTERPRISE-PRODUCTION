import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAssessment, fetchAssessmentAuditTrail, searchAssessments } from "./assessmentApi.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

/** No test file existed for this module before EAP-5 — added now for the
 * same reason `organizationApi.test.ts` was (`DECISION_LOG.md`'s EAP-4
 * entry): asserting the real URL string a search function builds, not just
 * that some request happened, is what would have caught EAP-4's own
 * `assessmentId`/`organizationId`-forwarding bug in `leadApi.ts` — this
 * closes the identical gap here before it can hide the same way, now that
 * `createdBy` is a new param this file needs to forward correctly. */
describe("assessmentApi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchAssessment requests the encoded id", async () => {
    await fetchAssessment("assessment 1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/assessments/assessment%201");
  });

  it("searchAssessments forwards every filter into the query string", async () => {
    await searchAssessments({
      search: "acme",
      framework: "dpdp",
      riskLevel: "high",
      organizationId: "org_1",
      createdBy: "user_1",
      sortBy: "riskScore",
      sortDirection: "asc",
      page: 2,
      pageSize: 10,
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/assessments/search?");
    expect(requestedUrl).toContain("search=acme");
    expect(requestedUrl).toContain("framework=dpdp");
    expect(requestedUrl).toContain("riskLevel=high");
    expect(requestedUrl).toContain("organizationId=org_1");
    expect(requestedUrl).toContain("createdBy=user_1");
    expect(requestedUrl).toContain("sortBy=riskScore");
    expect(requestedUrl).toContain("sortDirection=asc");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).toContain("pageSize=10");
  });

  it("searchAssessments omits empty query params", async () => {
    await searchAssessments({});
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toBe("http://localhost:8787/api/assessments/search");
  });

  it("fetchAssessmentAuditTrail filters by entityType/entityId", async () => {
    await fetchAssessmentAuditTrail("assessment_1");
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("entityType=assessment");
    expect(requestedUrl).toContain("entityId=assessment_1");
  });
});
