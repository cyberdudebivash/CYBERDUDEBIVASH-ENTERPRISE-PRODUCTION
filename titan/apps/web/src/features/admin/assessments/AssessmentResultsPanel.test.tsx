import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { AssessmentResult } from "@titan/assessment-core";
import type { AssessmentRecord } from "@titan/platform";
import { AssessmentResultsPanel } from "./AssessmentResultsPanel.js";

const result: AssessmentResult = {
  score: 67,
  riskLevel: "high",
  breakdown: { critical: 1, high: 2, medium: 0, low: 9, total: 3 },
  gaps: [
    {
      questionId: "has_dpo",
      question: "Do you have a Data Protection Officer (DPO) appointed?",
      level: "critical",
      penalty: "₹150 crore (SDF violation)",
      section: "Section 10",
    },
    {
      questionId: "dpia",
      question: "Do you conduct Data Protection Impact Assessments (DPIA)?",
      level: "high",
      penalty: "₹150 crore (DPIA gap)",
      section: "Section 27",
    },
  ],
  scoredQuestionCount: 12,
};

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "assessment_1",
    organizationId: null,
    createdBy: null,
    framework: "dpdp",
    frameworkVersion: "1.0.0",
    answers: { has_dpo: false, dpia: false, consent_mechanism: true },
    result,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

/** The Findings section shows only failing questions; Question responses
 * shows every question. The same question text legitimately appears in
 * both, so every test below scopes its query to the one section it means —
 * an unscoped query is genuinely ambiguous between the two, not a bug in
 * either section. */
function findingsSection() {
  return screen.getByRole("heading", { name: "Findings" }).closest("section")!;
}
function coverageSection() {
  return screen.getByRole("heading", { name: "Category coverage" }).closest("section")!;
}
function responsesSection() {
  return screen.getByRole("heading", { name: "Question responses" }).closest("section")!;
}

describe("AssessmentResultsPanel", () => {
  it("renders the risk badge, score, and framework badge", () => {
    render(<AssessmentResultsPanel assessment={makeAssessment()} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("67 / 100")).toBeInTheDocument();
    expect(screen.getByText("dpdp v1.0.0")).toBeInTheDocument();
  });

  it("groups findings by severity, critical before high, showing section and penalty", () => {
    render(<AssessmentResultsPanel assessment={makeAssessment()} />);
    const findings = within(findingsSection());
    const headings = findings.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["critical findings (1)", "high findings (1)"]);
    expect(
      findings.getByText("Do you have a Data Protection Officer (DPO) appointed?"),
    ).toBeInTheDocument();
    expect(findings.getByText("Section 10")).toBeInTheDocument();
    expect(findings.getByText("₹150 crore (SDF violation)")).toBeInTheDocument();
  });

  it("shows a real 'no gaps' message when nothing failed", () => {
    render(
      <AssessmentResultsPanel
        assessment={makeAssessment({
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

  it("shows real category coverage counts derived from the question bank + server-computed gaps", () => {
    render(<AssessmentResultsPanel assessment={makeAssessment()} />);
    const coverage = within(coverageSection());
    // Section 10 has exactly one scored question (has_dpo) in the real bank,
    // and it's a real gap here — 0 of 1 passing.
    const section10Row = coverage.getByText("Section 10").closest("li");
    expect(within(section10Row!).getByText("0 / 1 controls passing")).toBeInTheDocument();
  });

  it("renders every question's real answer, marking scored questions Pass/Gap from the server's own gaps", () => {
    render(<AssessmentResultsPanel assessment={makeAssessment()} />);
    const responses = within(responsesSection());

    const dpoRow = responses
      .getByText("Do you have a Data Protection Officer (DPO) appointed?")
      .closest("li");
    expect(within(dpoRow!).getByText("No")).toBeInTheDocument();
    expect(within(dpoRow!).getByText("Gap")).toBeInTheDocument();

    const consentRow = responses
      .getByText("Is your consent mechanism granular, withdrawable, and auditable?")
      .closest("li");
    expect(within(consentRow!).getByText("Yes")).toBeInTheDocument();
    expect(within(consentRow!).getByText("Pass")).toBeInTheDocument();

    // An unanswered question shows honestly as "Not answered", no fabricated default.
    const retentionRow = responses
      .getByText("Do you have a data retention and deletion policy with automated enforcement?")
      .closest("li");
    expect(within(retentionRow!).getByText("Not answered")).toBeInTheDocument();

    // The free-text, non-scored company_info question has no Pass/Gap badge.
    const companyRow = responses
      .getByText("What is your company name, size, and sector?")
      .closest("li");
    expect(within(companyRow!).queryByText("Pass")).not.toBeInTheDocument();
    expect(within(companyRow!).queryByText("Gap")).not.toBeInTheDocument();
  });

  it("falls back to an honest note for a framework/version with no registered question bank", () => {
    render(
      <AssessmentResultsPanel
        assessment={makeAssessment({ framework: "iso27001", frameworkVersion: "2022" })}
      />,
    );
    expect(screen.getByText(/no question bank for it is registered/)).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<AssessmentResultsPanel assessment={makeAssessment()} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
