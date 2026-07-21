import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOrganization,
  fetchOrganization,
  fetchOrganizationAuditTrail,
  searchOrganizations,
  updateOrganization,
} from "./organizationApi.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("organizationApi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchOrganization requests the encoded id", async () => {
    await fetchOrganization("org 1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/organizations/org%201");
  });

  it("searchOrganizations forwards every filter into the query string", async () => {
    await searchOrganizations({
      search: "acme",
      status: "archived",
      industry: "Retail",
      region: "APAC",
      tag: "enterprise",
      sortBy: "updatedAt",
      sortDirection: "asc",
      page: 2,
      pageSize: 10,
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/organizations/search?");
    expect(requestedUrl).toContain("search=acme");
    expect(requestedUrl).toContain("status=archived");
    expect(requestedUrl).toContain("industry=Retail");
    expect(requestedUrl).toContain("region=APAC");
    expect(requestedUrl).toContain("tag=enterprise");
    expect(requestedUrl).toContain("sortBy=updatedAt");
    expect(requestedUrl).toContain("sortDirection=asc");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).toContain("pageSize=10");
  });

  it("searchOrganizations omits empty query params", async () => {
    await searchOrganizations({});
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toBe("http://localhost:8787/api/organizations/search");
  });

  it("createOrganization POSTs to /api/organizations", async () => {
    await createOrganization({
      name: "Acme Fintech",
      slug: "acme-fintech",
      industry: null,
      region: null,
      tags: [],
      createdAt: "2026-07-20T00:00:00.000Z",
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/organizations");
    expect(init?.method).toBe("POST");
  });

  it("updateOrganization PATCHes the encoded id", async () => {
    await updateOrganization("org 1", { industry: "Healthcare" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/organizations/org%201");
    expect(init?.method).toBe("PATCH");
  });

  it("fetchOrganizationAuditTrail filters by entityType/entityId", async () => {
    await fetchOrganizationAuditTrail("org_1");
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("entityType=organization");
    expect(requestedUrl).toContain("entityId=org_1");
  });
});
