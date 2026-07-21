import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { UserRecord } from "@titan/platform";
import { UserWorkspaceContent } from "./UserWorkspacePage.js";

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-0000-0000-0000-000000000000",
    name: "Asha Rao",
    email: "asha@acme.in",
    emailVerified: "2026-07-20T00:00:00.000Z",
    image: null,
    ...overrides,
  };
}

function searchResponse(
  users: UserRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      users,
      total: overrides.total ?? users.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function mockFetch(users: UserRecord[], searchOverrides = {}) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/users/search")) {
      return Promise.resolve(searchResponse(users, searchOverrides));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <UserWorkspaceContent />
    </MemoryRouter>,
  );
}

describe("UserWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real users with a working reference link", async () => {
    mockFetch([makeUser()]);
    renderWorkspace();

    const link = await screen.findByRole("link", { name: "Asha Rao" });
    expect(link).toHaveAttribute("href", "/admin/users/user-0000-0000-0000-000000000000");
    const table = within(screen.getByRole("table", { name: "Users" }));
    expect(table.getByText("asha@acme.in")).toBeInTheDocument();
    expect(table.getByText("Yes")).toBeInTheDocument();
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

  it("shows a real empty state when no users match", async () => {
    mockFetch([], { total: 0 });
    renderWorkspace();
    expect(await screen.findByText("No users match this search")).toBeInTheDocument();
  });

  it("re-fetches with the typed search term after debouncing", async () => {
    const user = userEvent.setup();
    mockFetch([makeUser()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.type(screen.getByRole("searchbox", { name: "Search users" }), "priya");

    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/users/search"));
      expect(searchCalls.at(-1)).toContain("search=priya");
    });
  });

  it("requests the next page from Pagination", async () => {
    const user = userEvent.setup();
    mockFetch([makeUser()], { total: 50, page: 1, pageSize: 25 });
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/users/search"));
      expect(searchCalls.at(-1)).toContain("page=2");
    });
  });

  it("sorts by a clicked column header", async () => {
    const user = userEvent.setup();
    mockFetch([makeUser()]);
    renderWorkspace();
    await screen.findByRole("link", { name: "Asha Rao" });

    await user.click(screen.getByRole("button", { name: "Email" }));
    await vi.waitFor(() => {
      const searchCalls = vi
        .mocked(fetch)
        .mock.calls.map((call) => String(call[0]))
        .filter((url) => url.includes("/api/users/search"));
      expect(searchCalls.at(-1)).toContain("sortBy=email");
    });
  });
});
