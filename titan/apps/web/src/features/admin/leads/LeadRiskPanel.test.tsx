import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { AssessmentResult } from "@titan/assessment-core";
import type { LeadRecord } from "@titan/platform";
import { LeadRiskPanel } from "./LeadRiskPanel.js";

const result: AssessmentResult = {
  score: 67,
  riskLevel: "high",
  breakdown: { critical: 1, high: 2, medium: 0, low: 9, total: 3 },
  gaps: [
    {
      questionId: "has_dpo",
      question: "Do you have a DPO?",
      level: "critical",
      penalty: "₹250 crore",
    },
    { questionId: "dpia", question: "Do you run DPIAs?", level: "high", penalty: "₹150 crore" },
    { questionId: "breach_sop", question: "Do you have a breach SOP?", level: "high" },
  ],
  scoredQuestionCount: 12,
};

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead_1",
    organizationId: null,
    assessmentId: null,
    name: "Asha Rao",
    email: "asha@acme.in",
    company: "Acme Fintech",
    answers: {},
    result,
    timestamp: "2026-07-20T00:00:00.000Z",
    source: "dpdp-scan",
    status: "new",
    priority: "medium",
    assignedTo: null,
    tags: [],
    ...overrides,
  };
}

const lead = makeLead();

describe("LeadRiskPanel", () => {
  it("renders the risk badge, score, and default framework label", () => {
    render(<LeadRiskPanel lead={lead} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("67 / 100")).toBeInTheDocument();
    expect(screen.getByText("DPDP v1.0.0")).toBeInTheDocument();
  });

  it("renders the linked assessment's real framework/version when one exists", () => {
    render(
      <LeadRiskPanel
        lead={lead}
        linkedAssessment={{
          id: "a1",
          organizationId: null,
          createdBy: null,
          framework: "dpdp",
          frameworkVersion: "1.0.0",
          answers: {},
          result,
          createdAt: "t",
        }}
      />,
    );
    expect(screen.getByText("dpdp v1.0.0")).toBeInTheDocument();
  });

  it("groups findings by severity, critical before high", () => {
    render(<LeadRiskPanel lead={lead} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["critical findings (1)", "high findings (2)"]);
    expect(screen.getByText("Do you have a DPO?")).toBeInTheDocument();
    expect(screen.getByText("Do you run DPIAs?")).toBeInTheDocument();
  });

  it("shows a real 'no gaps' message when nothing failed", () => {
    render(
      <LeadRiskPanel
        lead={makeLead({
          result: {
            score: 0,
            riskLevel: "low",
            breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
            gaps: [],
            scoredQuestionCount: 12,
          },
        })}
      />,
    );
    expect(screen.getByText("No gaps found — every scored control passed.")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<LeadRiskPanel lead={lead} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
