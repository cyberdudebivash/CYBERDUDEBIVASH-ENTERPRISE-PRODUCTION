import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PortalAssessmentDetailContent } from "./PortalAssessmentDetailPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("PortalAssessmentDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real assessment results, reusing AssessmentResultsPanel directly", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
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
      }),
    );

    render(
      <MemoryRouter>
        <PortalAssessmentDetailContent id="assessment_1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("40 / 100")).toBeInTheDocument();
  });

  it("shows an honest, non-fabricated message when the assessment isn't available to this organization", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Forbidden" } }), { status: 403 }),
    );

    render(
      <MemoryRouter>
        <PortalAssessmentDetailContent id="assessment_1" />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("This assessment is not available to your organization."),
    ).toBeInTheDocument();
  });
});
