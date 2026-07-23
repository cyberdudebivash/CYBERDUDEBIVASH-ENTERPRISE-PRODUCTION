import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchSupportRequests, updateSupportRequestStatus } from "./supportRequestApi.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("searchSupportRequests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ requests: [], total: 0, page: 1, pageSize: 25 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a request with no query string when no options are given", async () => {
    await searchSupportRequests({});
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("/api/support-requests/search");
    expect(requestedUrl.endsWith("/api/support-requests/search")).toBe(true);
  });

  it("forwards search/status/organizationId/page/pageSize in the query string", async () => {
    await searchSupportRequests({
      search: "download",
      status: "open",
      organizationId: "org_1",
      page: 2,
      pageSize: 10,
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain("search=download");
    expect(requestedUrl).toContain("status=open");
    expect(requestedUrl).toContain("organizationId=org_1");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).toContain("pageSize=10");
  });
});

describe("updateSupportRequestStatus", () => {
  it("PATCHes the real support request, url-encoding the id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "req 1", status: "resolved" }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await updateSupportRequestStatus("req 1", "resolved");
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/support-requests/req%201");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({ status: "resolved" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
