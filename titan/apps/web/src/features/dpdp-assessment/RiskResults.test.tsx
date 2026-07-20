import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import type { AssessmentResult } from "@titan/assessment-core";
import { RiskResults } from "./RiskResults.js";

const resultWithGaps: AssessmentResult = {
  score: 75,
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
  ],
  scoredQuestionCount: 12,
};

const resultWithNoGaps: AssessmentResult = {
  score: 0,
  riskLevel: "low",
  breakdown: { critical: 0, high: 0, medium: 0, low: 12, total: 0 },
  gaps: [],
  scoredQuestionCount: 12,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("RiskResults", () => {
  it("conveys the exact score and risk level as real (non-animated) text", () => {
    render(<RiskResults result={resultWithGaps} />);
    expect(screen.getByText("Risk score: 75 out of 100, HIGH RISK.")).toBeInTheDocument();
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
  });

  it("renders the risk breakdown counts", () => {
    render(<RiskResults result={resultWithGaps} />);
    expect(screen.getByText("Critical Gaps")).toBeInTheDocument();
    expect(screen.getByText("Compliant Areas")).toBeInTheDocument();
  });

  it("lists identified gaps with their section and penalty", () => {
    render(<RiskResults result={resultWithGaps} />);
    expect(screen.getByText("Identified Compliance Gaps (1)")).toBeInTheDocument();
    expect(
      screen.getByText("Do you have a Data Protection Officer (DPO) appointed?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Maximum penalty: ₹150 crore/)).toBeInTheDocument();
  });

  it("shows a positive message instead of a gap list when there are no gaps", () => {
    render(<RiskResults result={resultWithNoGaps} />);
    expect(
      screen.getByText("No critical gaps found against the questions answered"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Identified Compliance Gaps/)).not.toBeInTheDocument();
  });

  it("shows the compliance disclaimer required by PRODUCT_VISION.md", () => {
    render(<RiskResults result={resultWithGaps} />);
    expect(
      screen.getByText(/not a compliance certification and not legal advice/),
    ).toBeInTheDocument();
  });

  it("shows all three service tiers with their pricing", () => {
    render(<RiskResults result={resultWithGaps} />);
    expect(screen.getByText("Gap Analysis Lite")).toBeInTheDocument();
    expect(screen.getByText("Rs. 4,999")).toBeInTheDocument();
    expect(screen.getByText("Gap Analysis Pro")).toBeInTheDocument();
    expect(screen.getByText("Rs. 24,999")).toBeInTheDocument();
    expect(screen.getByText("Compliance Package")).toBeInTheDocument();
    expect(screen.getByText("Rs. 49,999")).toBeInTheDocument();
  });

  it("animates the decorative score number up to the real value over time", () => {
    vi.useFakeTimers();
    render(<RiskResults result={resultWithGaps} />);

    const decorativeValue = document.querySelector(".dpdp-risk-meter__value");
    expect(decorativeValue).toHaveTextContent("0");

    // setInterval's callback calls setState outside any React-triggered event, so
    // the resulting DOM update needs an explicit act() to flush synchronously.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(decorativeValue).toHaveTextContent("75");
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(<RiskResults result={resultWithGaps} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
