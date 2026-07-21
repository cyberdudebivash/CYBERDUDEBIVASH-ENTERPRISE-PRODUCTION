import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PortalAssessmentsPage } from "./PortalAssessmentsPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PortalAssessmentsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders this organization's own real assessments", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        assessments: [
          {
            id: "assessment_1",
            organizationId: "org_1",
            createdBy: null,
            framework: "dpdp",
            frameworkVersion: "1.0.0",
            answers: {},
            result: {
              score: 40,
              riskLevel: "medium",
              breakdown: { critical: 0, high: 0, medium: 1, low: 11, total: 1 },
              gaps: [],
              scoredQuestionCount: 12,
            },
            createdAt: "2026-07-20T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    );

    render(
      <MemoryRouter>
        <PortalAssessmentsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("table", { name: "Your organization's assessments" }),
    ).toBeInTheDocument();
    // Matches on the real link target rather than the locale-formatted date
    // text, which would otherwise depend on the test runner's own timezone.
    expect(screen.getByRole("link", { name: /2026/ })).toHaveAttribute(
      "href",
      "/portal/assessments/assessment_1",
    );
  });

  it("shows a real empty state when this organization has no assessments yet", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ assessments: [], total: 0, page: 1, pageSize: 20 }),
    );

    render(
      <MemoryRouter>
        <PortalAssessmentsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No assessments yet")).toBeInTheDocument();
  });
});
