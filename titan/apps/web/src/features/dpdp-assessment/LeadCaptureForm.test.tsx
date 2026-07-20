import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { AssessmentResult } from "@titan/assessment-core";
import { LeadCaptureForm } from "./LeadCaptureForm.js";
import { readLeads } from "./leadStore.js";

// vi.mock is hoisted above regular top-level declarations, so the mock factory
// can't close over a plain `const save = vi.fn()` declared above it — vi.hoisted
// hoists this declaration along with it.
const { save } = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("./pdfReport.js", () => ({
  buildDpdpReportPdf: vi.fn().mockResolvedValue({ save }),
  reportFileName: (company: string) => `DPDP-Risk-Report-${company}.pdf`,
}));

const result: AssessmentResult = {
  score: 42,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Full name"), "Asha Rao");
  await user.type(screen.getByLabelText("Work email"), "asha@acme.in");
  await user.type(screen.getByLabelText("Company name"), "Acme Fintech");
  await user.click(screen.getByRole("button", { name: "Send My Report" }));
  return user;
}

describe("LeadCaptureForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    save.mockClear();
  });

  it("has accessible labels for all three fields, even though the visible UI uses placeholders", () => {
    render(<LeadCaptureForm answers={{}} result={result} />);
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
  });

  it("shows an inline, announced error instead of a blocking alert() when fields are empty", async () => {
    const user = userEvent.setup();
    render(<LeadCaptureForm answers={{}} result={result} />);

    await user.click(screen.getByRole("button", { name: "Send My Report" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please fill in all fields to receive your report.",
    );
    expect(readLeads()).toEqual([]);
  });

  it("rejects the exact malformed email the original scanner's check accepted", async () => {
    const user = userEvent.setup();
    render(<LeadCaptureForm answers={{}} result={result} />);

    await user.type(screen.getByLabelText("Full name"), "Asha Rao");
    await user.type(screen.getByLabelText("Work email"), "@.");
    await user.type(screen.getByLabelText("Company name"), "Acme Fintech");
    await user.click(screen.getByRole("button", { name: "Send My Report" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid email address.");
    expect(readLeads()).toEqual([]);
  });

  it("submits the lead, downloads the report, and shows a confirmation on valid input", async () => {
    render(<LeadCaptureForm answers={{ has_dpo: false }} result={result} />);
    await fillValidForm();

    expect(await screen.findByText("Report sent")).toBeInTheDocument();
    expect(screen.getByText("asha@acme.in")).toBeInTheDocument();

    const leads = readLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: "Asha Rao",
      email: "asha@acme.in",
      company: "Acme Fintech",
      source: "dpdp-scan",
    });
    expect(save).toHaveBeenCalledWith("DPDP-Risk-Report-Acme Fintech.pdf");
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(<LeadCaptureForm answers={{}} result={result} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
