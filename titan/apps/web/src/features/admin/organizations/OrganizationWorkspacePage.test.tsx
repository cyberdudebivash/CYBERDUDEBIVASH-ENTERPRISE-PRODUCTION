import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { OrganizationRecord } from "@titan/platform";
import { OrganizationWorkspaceContent } from "./OrganizationWorkspacePage.js";

function makeOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: "org-0000-0000-0000-000000000000",
    name: "Acme Fintech",
    slug: "acme-fintech",
    status: "active",
    industry: "Financial Services",
    region: "APAC",
    tags: [],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function searchResponse(
  organizations: OrganizationRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      organizations,
      total: overrides.total ?? organizations.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function mockFetch(
  organizations: OrganizationRecord[],
  searchOverrides = {},
  onCreate?: (body: unknown) => OrganizationRecord,
) {
  vi.mocked(fetch).mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes("/api/organizations/search")) {
      return Promise.resolve(searchResponse(organizations, searchOverrides));
    }
    if (url === "http://localhost:8787/api/organizations" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as unknown;
      const created = onCreate?.(body) ?? makeOrganization();
      return Promise.resolve(new Response(JSON.stringify(created), { status: 201 }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <OrganizationWorkspaceContent />
    </MemoryRouter>,
  );
}

describe("OrganizationWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real organizations with a status badge and a working reference link", async () => {
    mockFetch([makeOrganization()]);
    renderWorkspace();

    const link = await screen.findByRole("link", { name: "Acme Fintech" });
    expect(link).toHaveAttribute("href", "/admin/organizations/org-0000-0000-0000-000000000000");
    const table = within(screen.getByRole("table", { name: "Organizations" }));
    expect(table.getByText("Active")).toBeInTheDocument();
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

  it("shows a real empty state when no organizations match", async () => {
    mockFetch([], { total: 0 });
    renderWorkspace();
    expect(await screen.findByText("No organizations match these filters")).toBeInTheDocument();
  });

  it("re-fetches with a status filter when one is chosen", async () => {
    const user = userEvent.setup();
    mockFetch([makeOrganization()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "Acme Fintech" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "archived");

    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/organizations/search"));
      expect(searchCalls.at(-1)).toContain("status=archived");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    mockFetch([makeOrganization()], { total: 50, page: 1, pageSize: 25 });
    renderWorkspace();
    await screen.findByRole("link", { name: "Acme Fintech" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/organizations/search"));
      expect(searchCalls.at(-1)).toContain("page=2");
    });
  });

  it("toggles an optional column's visibility", async () => {
    const user = userEvent.setup();
    mockFetch([makeOrganization({ region: "EMEA" })]);
    renderWorkspace();
    await screen.findByRole("link", { name: "Acme Fintech" });

    await user.click(screen.getByText("Columns"));
    const regionCheckbox = screen.getByRole("checkbox", { name: "Region" });
    expect(regionCheckbox).not.toBeChecked();
    await user.click(regionCheckbox);
    expect(regionCheckbox).toBeChecked();
    expect(screen.getByRole("columnheader", { name: "Region" })).toBeInTheDocument();
  });

  it("creates an organization via the New organization form, auto-slugging from the name", async () => {
    const user = userEvent.setup();
    let capturedBody: Record<string, unknown> | undefined;
    mockFetch([], {}, (body) => {
      capturedBody = body as Record<string, unknown>;
      return makeOrganization({
        id: "org-new",
        name: "Globex Retail",
        slug: "globex-retail",
      });
    });
    renderWorkspace();
    await screen.findByText("No organizations match these filters");

    await user.click(screen.getByRole("button", { name: "New organization" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Globex Retail");
    expect(screen.getByRole("textbox", { name: "Identifier (slug)" })).toHaveValue("globex-retail");
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    await vi.waitFor(() => {
      expect(capturedBody?.name).toBe("Globex Retail");
      expect(capturedBody?.slug).toBe("globex-retail");
    });
  });

  it("shows a real error alert when creation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/organizations/search")) {
        return Promise.resolve(searchResponse([]));
      }
      if (url === "http://localhost:8787/api/organizations" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({ error: { message: "An organization with this slug already exists" } }),
            { status: 409 },
          ),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    renderWorkspace();
    await screen.findByText("No organizations match these filters");

    await user.click(screen.getByRole("button", { name: "New organization" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Acme Fintech");
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    expect(
      await screen.findByText("An organization with this slug already exists"),
    ).toBeInTheDocument();
  });
});
