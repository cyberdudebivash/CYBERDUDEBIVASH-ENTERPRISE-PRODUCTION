import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { SupportRequestRecord } from "@titan/platform";
import { SupportRequestWorkspaceContent } from "./SupportRequestWorkspacePage.js";

function makeRequest(overrides: Partial<SupportRequestRecord> = {}): SupportRequestRecord {
  return {
    id: "req_1",
    organizationId: "org_1",
    createdBy: "user_1",
    subject: "Can't download my report",
    message: "The export button spins but nothing downloads.",
    status: "open",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function searchResponse(
  requests: SupportRequestRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      requests,
      total: overrides.total ?? requests.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <SupportRequestWorkspaceContent />
    </MemoryRouter>,
  );
}

describe("SupportRequestWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real support requests with a status badge and an organization link", async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeRequest()])));

    renderWorkspace();

    expect(await screen.findByText("Can't download my report")).toBeInTheDocument();
    const row = within(screen.getByRole("table"));
    expect(row.getByText("Open")).toBeInTheDocument();
    expect(row.getByRole("link", { name: "org_1" })).toHaveAttribute(
      "href",
      "/admin/organizations/org_1",
    );
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: "forbidden", message: "Platform Administrator role required" },
          }),
          { status: 403 },
        ),
      ),
    );

    renderWorkspace();

    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows a real empty state when no requests match", async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([], { total: 0 })));
    renderWorkspace();
    expect(await screen.findByText("No support requests match these filters")).toBeInTheDocument();
  });

  it("re-fetches with a status filter when one is chosen", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(searchResponse([makeRequest()])));
    renderWorkspace();
    await screen.findByText("Can't download my report");

    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "resolved");

    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("status=resolved");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(searchResponse([makeRequest()], { total: 50, page: 1, pageSize: 25 })),
    );
    renderWorkspace();
    await screen.findByText("Can't download my report");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("page=2");
    });
  });

  it("marks an open request resolved via the real PATCH route, then refreshes the table", async () => {
    const user = userEvent.setup();
    let searchCallCount = 0;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/support-requests/search")) {
        searchCallCount += 1;
        const status = searchCallCount === 1 ? "open" : "resolved";
        return Promise.resolve(searchResponse([makeRequest({ status })]));
      }
      if (init?.method === "PATCH") {
        return Promise.resolve(
          new Response(JSON.stringify(makeRequest({ status: "resolved" })), { status: 200 }),
        );
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    renderWorkspace();
    await screen.findByText("Can't download my report");

    await user.click(screen.getByRole("button", { name: "Mark resolved" }));

    await vi.waitFor(() => {
      const patchCall = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PATCH");
      expect(patchCall).toBeTruthy();
      expect(String(patchCall?.[0])).toContain("/api/support-requests/req_1");
      expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({ status: "resolved" });
    });

    // Scoped to the table itself — "Resolved" also appears as <option> text
    // in the Status filter <select> above it, the same ambiguity
    // LeadWorkspacePage.test.tsx's own equivalent assertion already avoids.
    await vi.waitFor(() => {
      expect(within(screen.getByRole("table")).getByText("Resolved")).toBeInTheDocument();
    });
  });

  it("shows a real error when the status update fails, without crashing the table", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/support-requests/search")) {
        return Promise.resolve(searchResponse([makeRequest()]));
      }
      if (init?.method === "PATCH") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Support request not found" } }), {
            status: 404,
          }),
        );
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    renderWorkspace();
    await screen.findByText("Can't download my report");

    await user.click(screen.getByRole("button", { name: "Mark resolved" }));

    expect(await screen.findByText("Could not update this support request")).toBeInTheDocument();
  });
});
