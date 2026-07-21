import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { AssessmentSummaryCard } from "./AssessmentSummaryCard.js";

describe("AssessmentSummaryCard", () => {
  it("renders real counts and the highest real severity with findings", () => {
    render(
      <AssessmentSummaryCard
        report={{
          total: 3,
          byRiskLevel: { critical: 1, high: 0, medium: 2, low: 0 },
          byFramework: { dpdp: 3 },
          latestAssessmentAt: "2026-07-20T00:00:00.000Z",
        }}
      />,
    );
    const assessmentsLabel = screen.getByText("Assessments");
    expect(assessmentsLabel.nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("shows an honest '—' with a hint, not a fabricated date, when there are no assessments yet", () => {
    render(
      <AssessmentSummaryCard
        report={{
          total: 0,
          byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
          byFramework: {},
          latestAssessmentAt: null,
        }}
      />,
    );
    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <AssessmentSummaryCard
        report={{
          total: 1,
          byRiskLevel: { critical: 0, high: 1, medium: 0, low: 0 },
          byFramework: { dpdp: 1 },
          latestAssessmentAt: "2026-07-20T00:00:00.000Z",
        }}
      />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
