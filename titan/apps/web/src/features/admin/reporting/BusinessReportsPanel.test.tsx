import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ExecutiveSummary } from "@titan/platform";
import { BusinessReportsPanel } from "./BusinessReportsPanel.js";

function makeSummary(overrides: Partial<ExecutiveSummary> = {}): ExecutiveSummary {
  return {
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
    audit: {
      total: 20,
      last24h: 3,
      last7d: 10,
      topActions: [{ action: "lead.created", count: 5 }],
    },
    generatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("BusinessReportsPanel", () => {
  it("renders a real breakdown table per business report", () => {
    render(<BusinessReportsPanel summary={makeSummary()} />);
    const statusTable = within(screen.getByRole("table", { name: "Leads by status" }));
    expect(statusTable.getByText("new")).toBeInTheDocument();
    expect(statusTable.getByText("5")).toBeInTheDocument();

    const frameworkTable = within(screen.getByRole("table", { name: "Assessments by framework" }));
    expect(frameworkTable.getByText("dpdp")).toBeInTheDocument();

    const actionsTable = within(screen.getByRole("table", { name: "Top audit actions" }));
    expect(actionsTable.getByText("lead.created")).toBeInTheDocument();
  });

  it("omits the organizations breakdown when organizations isn't configured", () => {
    render(
      <BusinessReportsPanel
        summary={makeSummary({
          organizations: { configured: false, total: 0, byStatus: { active: 0, archived: 0 } },
        })}
      />,
    );
    expect(
      screen.queryByRole("table", { name: "Organizations by status" }),
    ).not.toBeInTheDocument();
  });
});
