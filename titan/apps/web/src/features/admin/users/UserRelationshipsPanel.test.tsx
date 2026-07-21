import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import { UserRelationshipsPanel } from "./UserRelationshipsPanel.js";

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
    assignedTo: "user_1",
    tags: [],
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000001",
    organizationId: "org_1",
    createdBy: "user_1",
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: {},
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel(props: Parameters<typeof UserRelationshipsPanel>[0]) {
  return render(
    <MemoryRouter>
      <UserRelationshipsPanel {...props} />
    </MemoryRouter>,
  );
}

describe("UserRelationshipsPanel", () => {
  it("shows an honest empty state for both lists when nothing is linked", () => {
    renderPanel({
      assignedLeads: { status: "ready", data: [] },
      createdAssessments: { status: "ready", data: [] },
    });
    expect(screen.getByText("No leads are assigned to this user.")).toBeInTheDocument();
    expect(screen.getByText("No assessments were created by this user.")).toBeInTheDocument();
  });

  it("renders assigned leads and created assessments as deep links into their own modules", () => {
    renderPanel({
      assignedLeads: { status: "ready", data: [makeLead()] },
      createdAssessments: { status: "ready", data: [makeAssessment()] },
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
      assignedLeads: { status: "forbidden" },
      createdAssessments: { status: "ready", data: [] },
    });
    expect(screen.getAllByText("Platform Administrator role required to view this.")).toHaveLength(
      1,
    );
  });
});
