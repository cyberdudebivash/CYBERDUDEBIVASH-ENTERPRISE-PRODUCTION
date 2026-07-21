import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportAuditEvents, searchAuditEvents } from "./auditApi.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

describe("auditApi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ events: [], total: 0, page: 1, pageSize: 25 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searchAuditEvents forwards every filter into the query string", async () => {
    await searchAuditEvents({
      search: "lead",
      actorId: "user_1",
      organizationId: "org_1",
      action: "lead.created",
      entityType: "lead",
      entityId: "lead_1",
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-31T23:59:59.999Z",
      sortBy: "createdAt",
      sortDirection: "asc",
      page: 2,
      pageSize: 10,
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/audit/search?");
    expect(requestedUrl).toContain("search=lead");
    expect(requestedUrl).toContain("actorId=user_1");
    expect(requestedUrl).toContain("organizationId=org_1");
    expect(requestedUrl).toContain("action=lead.created");
    expect(requestedUrl).toContain("entityType=lead");
    expect(requestedUrl).toContain("entityId=lead_1");
    expect(requestedUrl).toContain("dateFrom=2026-07-01");
    expect(requestedUrl).toContain("dateTo=2026-07-31");
    expect(requestedUrl).toContain("sortBy=createdAt");
    expect(requestedUrl).toContain("sortDirection=asc");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).toContain("pageSize=10");
  });

  it("searchAuditEvents omits empty query params", async () => {
    await searchAuditEvents({});
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toBe("http://localhost:8787/api/audit/search");
  });

  it("exportAuditEvents requests the given format and forwards filters", async () => {
    fetchMock.mockResolvedValue(csvResponse("id,action\n", "audit-export-2026.csv"));
    await exportAuditEvents({ entityType: "lead" }, "csv");
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/audit/export?");
    expect(requestedUrl).toContain("entityType=lead");
    expect(requestedUrl).toContain("format=csv");
  });

  it("exportAuditEvents returns the blob and the server-chosen filename", async () => {
    fetchMock.mockResolvedValue(csvResponse("id,action\n", "audit-export-2026.csv"));
    const result = await exportAuditEvents({}, "csv");
    expect(result.filename).toBe("audit-export-2026.csv");
    expect(await result.blob.text()).toBe("id,action\n");
  });
});
