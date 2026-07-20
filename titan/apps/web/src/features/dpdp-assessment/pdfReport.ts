import type { AssessmentResult } from "@titan/assessment-core";

export interface DpdpReportInput {
  name: string;
  email: string;
  company: string;
  result: AssessmentResult;
}

const RISK_COLORS: Record<AssessmentResult["riskLevel"], readonly [number, number, number]> = {
  low: [16, 185, 129],
  medium: [245, 158, 11],
  high: [239, 68, 68],
  critical: [239, 68, 68],
};

/**
 * jsPDF's standard 14 fonts (helvetica/times/courier) use WinAnsi encoding, which
 * has no glyph for ₹ (U+20B9 predates that encoding) — it renders as a missing
 * character. The question bank's `penalty` strings (@titan/assessment-core) use ₹
 * because that's correct for on-screen display; this is a PDF-rendering-only
 * substitution, not a data change.
 */
export function sanitizeForPdf(text: string): string {
  return text.replace(/₹/g, "Rs. ");
}

/**
 * jsPDF is lazy-imported here, not at module load — Discovery (ARCHITECTURE.md)
 * flagged the original scanner loading it unconditionally on every page view, when
 * it's only ever needed once someone reaches results and asks for a download.
 */
export async function buildDpdpReportPdf({ name, email, company, result }: DpdpReportInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFillColor(10, 14, 23);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CYBERDUDEBIVASH®", 15, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("DPDP Compliance Risk Report", 15, 30);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 15, 48);
  doc.text(`Client: ${name} | ${company} | ${email}`, 15, 54);

  const [r, g, b] = RISK_COLORS[result.riskLevel];
  doc.setFillColor(r, g, b);
  doc.roundedRect(15, 62, 180, 30, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`RISK SCORE: ${result.score}/100 — ${result.riskLevel.toUpperCase()} RISK`, 20, 78);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Critical: ${result.breakdown.critical} | High: ${result.breakdown.high} | Medium: ${result.breakdown.medium} | Compliant: ${result.breakdown.low}`,
    20,
    86,
  );

  let y = 105;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFIED COMPLIANCE GAPS", 15, y);
  y += 10;

  result.gaps.forEach((gap, i) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(31, 41, 55);
    doc.roundedRect(15, y, 180, 28, 2, 2, "F");

    doc.setTextColor(239, 68, 68);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`GAP ${i + 1}: ${gap.section ?? "DPDP Act 2023"}`, 20, y + 8);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(gap.question, 160) as string[];
    doc.text(splitText, 20, y + 15);

    doc.setTextColor(239, 68, 68);
    doc.setFontSize(8);
    doc.text(`Maximum Penalty: ${sanitizeForPdf(gap.penalty ?? "Applicable")}`, 20, y + 24);

    y += 34;
  });

  if (result.gaps.length === 0) {
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("No gaps identified against the questions answered.", 15, y);
    y += 10;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(55, 65, 81);
  doc.line(15, y, 195, y);
  y += 10;

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NEXT STEPS", 15, y);
  y += 8;

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const steps = [
    "1. Review each identified gap against your current data practices.",
    "2. Prioritize Critical and High-risk gaps for immediate remediation.",
    "3. Book a Gap Analysis Lite (Rs. 4,999) for a personalized action plan.",
    "4. Consider Gap Analysis Pro (Rs. 24,999) for a full 72-hour assessment.",
    "5. Contact us at contact@cyberdudebivash.in for enterprise packages.",
  ];
  steps.forEach((step) => {
    const lines = doc.splitTextToSize(step, 180) as string[];
    doc.text(lines, 15, y);
    y += lines.length * 5 + 3;
  });

  // PRODUCT_VISION.md requires the "not a compliance guarantee" disclaimer on
  // every report "as a stated fact of what the product is" — Discovery found the
  // original's disclaimer covered "not legal advice" but not that specific point.
  y += 10;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  const disclaimer =
    'This report is an automated, self-reported risk indicator based on your answers to a structured questionnaire. It is not a compliance certification and does not constitute legal advice. A "low risk" result does not mean your organization is DPDPA-compliant. For definitive compliance guidance, consult a qualified DPDP legal expert. CYBERDUDEBIVASH (R) Private Limited. GSTIN: 21ARKPN8270G1ZP.';
  const discLines = doc.splitTextToSize(disclaimer, 180) as string[];
  doc.text(discLines, 15, y);

  return doc;
}

export function reportFileName(company: string): string {
  return `DPDP-Risk-Report-${company.trim().replace(/\s+/g, "-")}.pdf`;
}
