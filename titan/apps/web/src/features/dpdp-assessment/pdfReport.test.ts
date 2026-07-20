import { describe, expect, it } from "vitest";
import type { AssessmentResult } from "@titan/assessment-core";
import { buildDpdpReportPdf, reportFileName, sanitizeForPdf } from "./pdfReport.js";

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
    {
      questionId: "cross_border",
      question: "Have you assessed cross-border data transfers for adequacy?",
      level: "high",
      penalty: "₹250 crore (inadequate safeguards)",
      section: "Section 16",
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

describe("sanitizeForPdf", () => {
  // jsPDF's standard fonts have no glyph for ₹ (WinAnsi encoding predates it) —
  // this is the substitution that keeps generated PDFs legible, applied only at
  // the PDF-rendering boundary, not to the underlying question-bank data.
  it("replaces the rupee sign with an ASCII-safe equivalent", () => {
    expect(sanitizeForPdf("₹150 crore (SDF violation)")).toBe("Rs. 150 crore (SDF violation)");
  });

  it("leaves text without a rupee sign unchanged", () => {
    expect(sanitizeForPdf("No currency here")).toBe("No currency here");
  });
});

describe("buildDpdpReportPdf", () => {
  it("produces a well-formed PDF for a result with gaps", async () => {
    const doc = await buildDpdpReportPdf({
      name: "Asha Rao",
      email: "asha@acme.in",
      company: "Acme Fintech",
      result: resultWithGaps,
    });

    const dataUri = doc.output("datauristring");
    expect(dataUri.startsWith("data:application/pdf")).toBe(true);
    expect(dataUri.length).toBeGreaterThan(1000);
  });

  it("does not throw for a result with zero gaps", async () => {
    const doc = await buildDpdpReportPdf({
      name: "Asha Rao",
      email: "asha@acme.in",
      company: "Acme Fintech",
      result: resultWithNoGaps,
    });

    expect(doc.output("datauristring").startsWith("data:application/pdf")).toBe(true);
  });

  it("paginates once there are enough gaps to overflow a page", async () => {
    const manyGaps: AssessmentResult = {
      ...resultWithGaps,
      gaps: Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i}`,
        question: `Question number ${i}`,
        level: "medium" as const,
        penalty: "₹50 crore",
        section: `Section ${i}`,
      })),
    };

    const doc = await buildDpdpReportPdf({
      name: "Asha Rao",
      email: "asha@acme.in",
      company: "Acme Fintech",
      result: manyGaps,
    });

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe("reportFileName", () => {
  it("replaces whitespace with hyphens", () => {
    expect(reportFileName("Acme Fintech Pvt Ltd")).toBe(
      "DPDP-Risk-Report-Acme-Fintech-Pvt-Ltd.pdf",
    );
  });

  it("trims surrounding whitespace before building the name", () => {
    expect(reportFileName("  Acme  ")).toBe("DPDP-Risk-Report-Acme.pdf");
  });
});
