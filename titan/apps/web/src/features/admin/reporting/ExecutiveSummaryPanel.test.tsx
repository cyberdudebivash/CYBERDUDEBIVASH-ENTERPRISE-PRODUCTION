import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExecutiveSummary } from "@titan/platform";
import { ExecutiveSummaryPanel } from "./ExecutiveSummaryPanel.js";

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

describe("ExecutiveSummaryPanel", () => {
  it("renders real KPI values for a fully configured deployment", () => {
    render(<ExecutiveSummaryPanel summary={makeSummary()} />);
    expect(screen.getByText("Organizations").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Leads").nextSibling).toHaveTextContent("5");
    expect(screen.getByText("Assessments").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Platform Administrators").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Audit events (24h)").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("20 total")).toBeInTheDocument();
  });

  it("renders an honest '—' with a hint, not a fabricated 0, when organizations isn't configured", () => {
    render(
      <ExecutiveSummaryPanel
        summary={makeSummary({
          organizations: { configured: false, total: 0, byStatus: { active: 0, archived: 0 } },
        })}
      />,
    );
    expect(screen.getByText("Organizations").nextSibling).toHaveTextContent("—");
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });
});
