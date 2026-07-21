import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalReportsPage } from "./PortalReportsPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const summaryPayload = {
  organizationId: "org_1",
  assessments: {
    total: 2,
    byRiskLevel: { critical: 0, high: 1, medium: 1, low: 0 },
    byFramework: { dpdp: 2 },
    latestAssessmentAt: "2026-07-20T00:00:00.000Z",
  },
  generatedAt: "2026-07-21T00:00:00.000Z",
};

describe("PortalReportsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a real compliance report with breakdown tables", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(summaryPayload));
    render(<PortalReportsPage />);

    expect(
      await screen.findByRole("table", { name: "Assessments by risk level" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Assessments by framework" })).toBeInTheDocument();
  });

  it("exports a real CSV file when Export CSV is clicked", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/reports/summary")) {
        return Promise.resolve(jsonResponse(summaryPayload));
      }
      if (url.includes("/api/portal/reports/export")) {
        return Promise.resolve(
          new Response("section,metric,value\r\nassessments,total,2", {
            status: 200,
            headers: {
              "content-type": "text/csv",
              "content-disposition": 'attachment; filename="compliance-summary-2026-07-21.csv"',
            },
          }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(<PortalReportsPage />);
    await screen.findByRole("table", { name: "Assessments by risk level" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalled();
  });
});
