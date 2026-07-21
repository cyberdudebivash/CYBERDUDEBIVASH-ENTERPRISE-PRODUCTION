import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AuditEventRecord } from "@titan/platform";
import { AuditWorkspaceContent } from "./AuditWorkspacePage.js";

function makeEvent(overrides: Partial<AuditEventRecord> = {}): AuditEventRecord {
  return {
    id: "event-1",
    actorId: "user_1",
    organizationId: null,
    action: "lead.created",
    entityType: "lead",
    entityId: "lead_1",
    metadata: { source: "dpdp-scan" },
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function searchResponse(
  events: AuditEventRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      events,
      total: overrides.total ?? events.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function mockFetch(events: AuditEventRecord[], searchOverrides = {}) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/audit/export")) {
      return Promise.resolve(
        new Response("id,action\nevent-1,lead.created\n", {
          status: 200,
          headers: {
            "content-type": "text/csv",
            "content-disposition": 'attachment; filename="audit-export.csv"',
          },
        }),
      );
    }
    if (url.includes("/api/audit/search")) {
      return Promise.resolve(searchResponse(events, searchOverrides));
    }
    if (url.includes("/api/audit?")) {
      return Promise.resolve(new Response(JSON.stringify(events), { status: 200 }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <AuditWorkspaceContent />
    </MemoryRouter>,
  );
}

describe("AuditWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real audit events with an action label and an entity badge", async () => {
    mockFetch([makeEvent()]);
    renderWorkspace();

    const table = within(await screen.findByRole("table", { name: "Audit events" }));
    expect(table.getByText("Lead created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lead" })).toHaveAttribute(
      "href",
      "/admin/leads/lead_1",
    );
  });

  it("shows an honest 'Platform Administrator role required' message for a forbidden search", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "forbidden", message: "Platform Administrator role required" },
        }),
        { status: 403 },
      ),
    );
    renderWorkspace();
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });

  it("shows a real empty state when no events match", async () => {
    mockFetch([], { total: 0 });
    renderWorkspace();
    expect(await screen.findByText("No audit events match these filters")).toBeInTheDocument();
  });

  it("re-fetches with an entityType filter when one is chosen", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent()]);
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Entity type" }), "lead");

    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/audit/search"));
      expect(searchCalls.at(-1)).toContain("entityType=lead");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent()], { total: 50, page: 1, pageSize: 25 });
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/audit/search"));
      expect(searchCalls.at(-1)).toContain("page=2");
    });
  });

  it("toggles an optional column's visibility", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent({ organizationId: "org_1" })]);
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.click(screen.getByText("Columns"));
    const organizationCheckbox = screen.getByRole("checkbox", { name: "Organization" });
    expect(organizationCheckbox).toBeChecked();
    await user.click(organizationCheckbox);
    expect(organizationCheckbox).not.toBeChecked();
    expect(screen.queryByRole("columnheader", { name: "Organization" })).not.toBeInTheDocument();
  });

  it("opens the event detail panel when a timestamp is clicked", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent()]);
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.click(screen.getByRole("button", { name: /2026/ }));

    expect(await screen.findByRole("region", { name: "Audit event details" })).toBeInTheDocument();
    // has a real actorId, so the "System / anonymous" fallback should not render
    expect(screen.queryByText("System / anonymous")).not.toBeInTheDocument();
  });

  it("switches to the Investigation view and groups events", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent(), makeEvent({ id: "event-2", action: "lead.viewed" })]);
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.click(screen.getByRole("button", { name: "Investigation" }));

    expect(screen.getByText("Lead lead_1")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
  });

  it("exports CSV via the Export CSV button", async () => {
    const user = userEvent.setup();
    mockFetch([makeEvent()]);
    renderWorkspace();
    await screen.findByRole("table", { name: "Audit events" });

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    await vi.waitFor(() => {
      const exportCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/audit/export"));
      expect(exportCalls.at(-1)).toContain("format=csv");
    });
  });
});
