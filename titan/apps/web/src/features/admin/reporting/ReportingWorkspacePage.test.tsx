import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ReportingWorkspaceContent } from "./ReportingWorkspacePage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const summaryPayload = {
  organizations: { configured: true, total: 3, byStatus: { active: 2, archived: 1 } },
  leads: {
    total: 5,
    byStatus: { new: 5, contacted: 0, qualified: 0, disqualified: 0, converted: 0 },
    byPriority: { low: 0, medium: 5, high: 0, urgent: 0 },
    byRiskLevel: { critical: 1, high: 1, medium: 2, low: 1 },
  },
  assessments: {
    total: 2,
    byRiskLevel: { critical: 0, high: 1, medium: 1, low: 0 },
    byFramework: { dpdp: 2 },
  },
  identity: { configured: true, totalUsers: 4, totalProfiles: 6, platformAdministrators: 1 },
  audit: { total: 20, last24h: 3, last7d: 10, topActions: [{ action: "lead.created", count: 5 }] },
  generatedAt: "2026-07-21T00:00:00.000Z",
};

function mockFetch() {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/reports/summary")) {
      return Promise.resolve(jsonResponse(summaryPayload));
    }
    if (url.includes("/api/reports/trends")) {
      return Promise.resolve(
        jsonResponse({ entity: "leads", days: 30, points: [{ date: "2026-07-21", count: 1 }] }),
      );
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

describe("ReportingWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Executive Dashboard, Business Reports, and Analytics for a Platform Administrator", async () => {
    mockFetch();
    render(
      <ReportingWorkspaceContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    const executiveDashboard = within(screen.getByRole("region", { name: "Executive Dashboard" }));
    const organizationsLabel = await executiveDashboard.findByText("Organizations");
    expect(organizationsLabel.nextSibling).toHaveTextContent("3");
    expect(await screen.findByRole("table", { name: "Leads by status" })).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Leads trend by day" })).toBeInTheDocument();
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin", async () => {
    mockFetch();
    render(
      <ReportingWorkspaceContent
        me={{ userId: "u2", email: "member@acme.in", profiles: [], isPlatformAdministrator: false }}
      />,
    );

    expect(
      await screen.findAllByText("Platform Administrator role required to view this."),
    ).not.toHaveLength(0);
  });

  it("shows a real error alert when the summary request fails", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/reports/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Internal server error" } }), {
            status: 500,
          }),
        );
      }
      if (url.includes("/api/reports/trends")) {
        return Promise.resolve(
          jsonResponse({ entity: "leads", days: 30, points: [{ date: "2026-07-21", count: 0 }] }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <ReportingWorkspaceContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    expect(await screen.findAllByText("Internal server error")).not.toHaveLength(0);
  });
});
