import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { dpdpV1 } from "@titan/assessment-core";
import { DpdpAssessmentPage } from "./DpdpAssessmentPage.js";

vi.mock("./pdfReport.js", () => ({
  buildDpdpReportPdf: vi.fn().mockResolvedValue({ save: vi.fn() }),
  reportFileName: (company: string) => `DPDP-Risk-Report-${company}.pdf`,
}));

async function answerEveryQuestionFailingEveryRiskCheck(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < dpdpV1.questions.length; i++) {
    const textbox = screen.queryByRole("textbox");
    if (textbox) {
      await user.type(textbox, "Acme Fintech, 25 employees");
    } else {
      await user.click(screen.getByRole("radio", { name: "No, we do not have this in place" }));
    }
    const isLast = i === dpdpV1.questions.length - 1;
    await user.click(screen.getByRole("button", { name: isLast ? "Get My Report" : "Next" }));
  }
}

describe("DpdpAssessmentPage", () => {
  it("walks landing -> questions -> loading -> results, scored entirely by @titan/assessment-core", async () => {
    const user = userEvent.setup();
    render(<DpdpAssessmentPage />);

    await user.click(screen.getByRole("button", { name: "Start Free Risk Scan" }));
    expect(
      screen.getByRole("heading", { name: "DPDP Compliance Risk Scanner" }),
    ).toBeInTheDocument();

    await answerEveryQuestionFailingEveryRiskCheck(user);

    expect(screen.getByRole("status")).toHaveTextContent("Analyzing your compliance posture");

    // 12 scoreable questions, every one answered "No": score 100, CRITICAL RISK —
    // the exact scenario @titan/assessment-core's own regression test pins
    // (ARCHITECTURE.md: the original scanner would have miscalculated this as 92).
    expect(
      await screen.findByText("Risk score: 100 out of 100, CRITICAL RISK.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Get your full report via email")).toBeInTheDocument();
  }, 10000);

  it("keeps Next disabled until the current question has an answer", async () => {
    const user = userEvent.setup();
    render(<DpdpAssessmentPage />);
    await user.click(screen.getByRole("button", { name: "Start Free Risk Scan" }));

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "Acme");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("hides the Back button on the first question and shows it after advancing", async () => {
    const user = userEvent.setup();
    render(<DpdpAssessmentPage />);
    await user.click(screen.getByRole("button", { name: "Start Free Risk Scan" }));

    // A visibility:hidden button with no aria-label has no accessible name at
    // all (real accessible-name-computation behavior, not a testing-library
    // quirk) — so the correct assertion is that no accessible "Back" control
    // exists yet, not that a hidden one can be found and inspected.
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "Acme");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Back" })).toBeVisible();
  });

  it("has no structural accessibility violations on the landing view", async () => {
    const { container } = render(<DpdpAssessmentPage />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
