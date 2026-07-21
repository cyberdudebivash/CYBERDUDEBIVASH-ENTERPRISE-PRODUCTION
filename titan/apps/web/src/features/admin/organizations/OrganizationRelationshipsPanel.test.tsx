import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import { OrganizationRelationshipsPanel } from "./OrganizationRelationshipsPanel.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: "org_1",
    assessmentId: null,
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result: sampleResult,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: null,
    tags: [],
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000001",
    organizationId: "org_1",
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: {},
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel(props: Parameters<typeof OrganizationRelationshipsPanel>[0]) {
  return render(
    <MemoryRouter>
      <OrganizationRelationshipsPanel {...props} />
    </MemoryRouter>,
  );
}

describe("OrganizationRelationshipsPanel", () => {
  it("shows an honest empty state for both lists when nothing is linked", () => {
    renderPanel({
      leads: { status: "ready", data: [] },
      assessments: { status: "ready", data: [] },
    });
    expect(screen.getByText("No leads are linked to this organization.")).toBeInTheDocument();
    expect(screen.getByText("No assessments are linked to this organization.")).toBeInTheDocument();
  });

  it("renders linked leads and assessments as deep links into their own modules", () => {
    renderPanel({
      leads: { status: "ready", data: [makeLead()] },
      assessments: { status: "ready", data: [makeAssessment()] },
    });
    expect(screen.getByRole("link", { name: "Asha Rao" })).toHaveAttribute(
      "href",
      "/admin/leads/lead_1",
    );
    expect(screen.getByRole("link", { name: /a1b2c3d4 — dpdp v1.0.0/ })).toHaveAttribute(
      "href",
      "/admin/assessments/a1b2c3d4-0000-0000-0000-000000000001",
    );
  });

  it("shows a forbidden note when the underlying search is forbidden", () => {
    renderPanel({
      leads: { status: "forbidden" },
      assessments: { status: "ready", data: [] },
    });
    expect(screen.getAllByText("Platform Administrator role required to view this.")).toHaveLength(
      1,
    );
  });
});
