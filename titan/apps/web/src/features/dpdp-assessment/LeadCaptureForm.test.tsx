import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { AssessmentResult } from "@titan/assessment-core";
import { LeadCaptureForm } from "./LeadCaptureForm.js";

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
    save.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects the exact malformed email the original scanner's check accepted", async () => {
    const user = userEvent.setup();
    render(<LeadCaptureForm answers={{}} result={result} />);

    await user.type(screen.getByLabelText("Full name"), "Asha Rao");
    await user.type(screen.getByLabelText("Work email"), "@.");
    await user.type(screen.getByLabelText("Company name"), "Acme Fintech");
    await user.click(screen.getByRole("button", { name: "Send My Report" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid email address.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits the lead to the Worker API, downloads the report, and shows a confirmation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "lead_1" }), { status: 201 }),
    );
    render(<LeadCaptureForm answers={{ has_dpo: false }} result={result} />);
    await fillValidForm();

    expect(await screen.findByText("Report sent")).toBeInTheDocument();
    expect(screen.getByText("asha@acme.in")).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("/api/leads");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      name: "Asha Rao",
      email: "asha@acme.in",
      company: "Acme Fintech",
      source: "dpdp-scan",
    });
    expect(save).toHaveBeenCalledWith("DPDP-Risk-Report-Acme Fintech.pdf");
  });

  it("shows the server's error message and lets the user retry when the API rejects the submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Missing or invalid field: email" } }), {
        status: 400,
      }),
    );
    render(<LeadCaptureForm answers={{}} result={result} />);
    await fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Missing or invalid field: email");
    // The button re-enables and the form isn't cleared, so retrying is just
    // submitting again — the same request this time succeeding.
    const submitButton = screen.getByRole("button", { name: "Send My Report" });
    expect(submitButton).not.toBeDisabled();

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "lead_1" }), { status: 201 }),
    );
    await userEvent.click(submitButton);
    expect(await screen.findByText("Report sent")).toBeInTheDocument();
  });

  it("shows a network-specific error message when the request never reaches the server", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));
    render(<LeadCaptureForm answers={{}} result={result} />);
    await fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(<LeadCaptureForm answers={{}} result={result} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
