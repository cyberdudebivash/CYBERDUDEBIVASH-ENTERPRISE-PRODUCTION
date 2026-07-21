import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord } from "@titan/platform";
import { ComplianceIntelligencePanel } from "./ComplianceIntelligencePanel.js";

const sampleResult: AssessmentResult = {
  score: 33,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "assessment_1",
    organizationId: null,
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: { has_dpo: false },
    result: sampleResult,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function listResponse(assessments: AssessmentRecord[]) {
  return new Response(JSON.stringify(assessments), { status: 200 });
}

describe("ComplianceIntelligencePanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an honest empty state when no assessments exist", async () => {
    vi.mocked(fetch).mockResolvedValue(listResponse([]));
    render(<ComplianceIntelligencePanel />);
    expect(await screen.findByText(/No assessments yet/)).toBeInTheDocument();
  });

  it("renders real aggregate metrics from the full assessment list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      listResponse([
        makeAssessment({
          id: "a1",
          result: {
            ...sampleResult,
            score: 88,
            riskLevel: "critical",
            gaps: [
              {
                questionId: "has_dpo",
                question: "Do you have a DPO?",
                level: "critical",
                section: "Section 10",
              },
            ],
          },
        }),
        makeAssessment({
          id: "a2",
          result: { ...sampleResult, score: 10, riskLevel: "low", gaps: [] },
        }),
      ]),
    );

    render(<ComplianceIntelligencePanel />);

    expect(
      await screen.findByText("2", { selector: ".titan-metric-card__value" }),
    ).toBeInTheDocument(); // Assessments metric
    expect(
      screen.getByText("49 / 100", { selector: ".titan-metric-card__value" }),
    ).toBeInTheDocument(); // average of 88 and 10
    expect(screen.getByText("dpdp v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Section 10")).toBeInTheDocument();
  });

  it("shows a real 'no open findings' note when every assessment has zero gaps", async () => {
    vi.mocked(fetch).mockResolvedValue(
      listResponse([makeAssessment({ result: { ...sampleResult, gaps: [] } })]),
    );
    render(<ComplianceIntelligencePanel />);
    expect(await screen.findByText(/No open findings/)).toBeInTheDocument();
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "forbidden" } }), { status: 403 }),
    );
    render(<ComplianceIntelligencePanel />);
    expect(
      await screen.findByText("Platform Administrator role required to view this."),
    ).toBeInTheDocument();
  });
});
