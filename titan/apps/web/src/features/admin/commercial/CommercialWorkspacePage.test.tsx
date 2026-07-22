import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { SubscriptionRecord } from "@titan/platform";
import { CommercialWorkspaceContent } from "./CommercialWorkspacePage.js";

function makeSubscription(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    id: "sub-0000-0000-0000-000000000000",
    organizationId: "org_1",
    planId: "professional",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    canceledAt: null,
    ...overrides,
  };
}

function searchResponse(
  subscriptions: SubscriptionRecord[],
  overrides: Partial<{ total: number; page: number; pageSize: number }> = {},
) {
  return new Response(
    JSON.stringify({
      subscriptions,
      total: overrides.total ?? subscriptions.length,
      page: overrides.page ?? 1,
      pageSize: overrides.pageSize ?? 25,
    }),
    { status: 200 },
  );
}

function mockFetch(subscriptions: SubscriptionRecord[], searchOverrides = {}) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/commercial/subscriptions/search")) {
      return Promise.resolve(searchResponse(subscriptions, searchOverrides));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <CommercialWorkspaceContent />
    </MemoryRouter>,
  );
}

describe("CommercialWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real subscriptions with a working detail link and status badge", async () => {
    mockFetch([makeSubscription()]);
    renderWorkspace();

    const link = await screen.findByRole("link", { name: "org_1" });
    expect(link).toHaveAttribute("href", "/admin/commercial/sub-0000-0000-0000-000000000000");
    const table = within(screen.getByRole("table", { name: "Subscriptions" }));
    expect(table.getByText("professional")).toBeInTheDocument();
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

  it("shows a real empty state when no subscriptions match", async () => {
    mockFetch([], { total: 0 });
    renderWorkspace();
    expect(await screen.findByText("No subscriptions match this search")).toBeInTheDocument();
  });
});
