import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord, LeadRecord } from "@titan/platform";
import { OrganizationHealthPanel } from "./OrganizationHealthPanel.js";

function makeResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    score: 50,
    riskLevel: "medium",
    breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
    gaps: [],
    scoredQuestionCount: 12,
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "assessment_1",
    organizationId: "org_1",
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: {},
    result: makeResult(),
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("OrganizationHealthPanel", () => {
  it("shows an honest empty state when there are no linked assessments", () => {
    render(<OrganizationHealthPanel assessments={[]} leads={[]} />);
    expect(screen.getByText(/No assessments linked to this organization yet/)).toBeInTheDocument();
  });

  it("shows the most recent assessment's risk level as the current risk", () => {
    render(
      <OrganizationHealthPanel
        assessments={[
          makeAssessment({
            id: "old",
            createdAt: "2026-07-19T00:00:00.000Z",
            result: makeResult({ riskLevel: "low", score: 90 }),
          }),
          makeAssessment({
            id: "new",
            createdAt: "2026-07-20T00:00:00.000Z",
            result: makeResult({ riskLevel: "critical", score: 10 }),
          }),
        ]}
        leads={[]}
      />,
    );
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("reports a real assessment count and lead count", () => {
    // Both default-fixture assessments score "medium", so the risk
    // distribution list also shows a "2" (medium: 2) — scoped to the metric
    // card value so this asserts the *metric*, not just that "2" appears
    // somewhere on the page (same ambiguous-query class EAP-3's
    // ComplianceIntelligencePanel.test.tsx hit).
    const leads = [{ id: "lead_1" } as LeadRecord];
    render(
      <OrganizationHealthPanel
        assessments={[makeAssessment(), makeAssessment({ id: "a2" })]}
        leads={leads}
      />,
    );
    expect(screen.getByText("2", { selector: ".titan-metric-card__value" })).toBeInTheDocument();
    expect(screen.getByText("1", { selector: ".titan-metric-card__value" })).toBeInTheDocument();
  });

  it("reports a downward trend when the latest assessment scores lower than the previous one", () => {
    render(
      <OrganizationHealthPanel
        assessments={[
          makeAssessment({
            id: "old",
            createdAt: "2026-07-19T00:00:00.000Z",
            result: makeResult({ score: 90 }),
          }),
          makeAssessment({
            id: "new",
            createdAt: "2026-07-20T00:00:00.000Z",
            result: makeResult({ score: 40 }),
          }),
        ]}
        leads={[]}
      />,
    );
    expect(screen.getByText(/Risk score decreased/)).toBeInTheDocument();
  });
});
