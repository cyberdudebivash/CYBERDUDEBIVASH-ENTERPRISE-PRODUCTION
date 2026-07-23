import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PortalDashboardPage } from "./PortalDashboardPage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function mockFetch() {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/portal/organization")) {
      return Promise.resolve(
        jsonResponse({
          id: "org_1",
          name: "Acme Fintech",
          slug: "acme-fintech",
          status: "active",
          industry: "Financial Services",
          region: "APAC",
          tags: [],
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        }),
      );
    }
    if (url.includes("/api/portal/reports/summary")) {
      return Promise.resolve(
        jsonResponse({
          organizationId: "org_1",
          assessments: {
            total: 2,
            byRiskLevel: { critical: 0, high: 1, medium: 1, low: 0 },
            byFramework: { dpdp: 2 },
            latestAssessmentAt: "2026-07-20T00:00:00.000Z",
          },
          generatedAt: "2026-07-21T00:00:00.000Z",
        }),
      );
    }
    if (url.includes("/api/portal/activity")) {
      return Promise.resolve(
        jsonResponse([
          {
            id: "event_1",
            actorId: "user_1",
            organizationId: "org_1",
            action: "assessment.created",
            entityType: "assessment",
            entityId: "assessment_1",
            metadata: null,
            createdAt: "2026-07-20T00:00:00.000Z",
          },
        ]),
      );
    }
    if (url.includes("/api/portal/dpdp-scanner/access")) {
      return Promise.resolve(jsonResponse({ hasAccess: false }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

describe("PortalDashboardPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real Organization Overview, Compliance Summary, and Recent Activity", async () => {
    mockFetch();
    render(
      <MemoryRouter>
        <PortalDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Acme Fintech")).toBeInTheDocument();
    const assessmentsLabel = await screen.findByText("Assessments");
    expect(assessmentsLabel.nextSibling).toHaveTextContent("2");
    expect(await screen.findByText("Assessment created")).toBeInTheDocument();
  });

  it("shows a real error alert when a section fails to load", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/organization")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Internal server error" } }), {
            status: 500,
          }),
        );
      }
      if (url.includes("/api/portal/reports/summary")) {
        return Promise.resolve(
          jsonResponse({
            organizationId: "org_1",
            assessments: {
              total: 0,
              byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
              byFramework: {},
              latestAssessmentAt: null,
            },
            generatedAt: "2026-07-21T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/activity")) {
        return Promise.resolve(jsonResponse([]));
      }
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: false }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <MemoryRouter>
        <PortalDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });

  it("shows an honest empty state for Recent Activity when nothing has happened yet", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/organization")) {
        return Promise.resolve(
          jsonResponse({
            id: "org_1",
            name: "Acme Fintech",
            slug: "acme-fintech",
            status: "active",
            industry: null,
            region: null,
            tags: [],
            createdAt: "2026-07-01T00:00:00.000Z",
            updatedAt: "2026-07-01T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/reports/summary")) {
        return Promise.resolve(
          jsonResponse({
            organizationId: "org_1",
            assessments: {
              total: 0,
              byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
              byFramework: {},
              latestAssessmentAt: null,
            },
            generatedAt: "2026-07-21T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/activity")) {
        return Promise.resolve(jsonResponse([]));
      }
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: false }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <MemoryRouter>
        <PortalDashboardPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("No activity recorded for your organization yet."),
    ).toBeInTheDocument();
  });

  it("shows the premium DPDP Scanner card near the top, with a real access-aware call to action", async () => {
    mockFetch();
    render(
      <MemoryRouter>
        <PortalDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("DPDP Compliance Scanner")).toBeInTheDocument();
    expect(screen.getByText("Premium feature")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Unlock the scanner →" })).toHaveAttribute(
      "href",
      "/portal/dpdp-scanner",
    );
  });

  it("offers to run a new scan instead of unlocking once the organization already has access", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/portal/dpdp-scanner/access")) {
        return Promise.resolve(jsonResponse({ hasAccess: true }));
      }
      if (url.includes("/api/portal/organization")) {
        return Promise.resolve(
          jsonResponse({
            id: "org_1",
            name: "Acme Fintech",
            slug: "acme-fintech",
            status: "active",
            industry: null,
            region: null,
            tags: [],
            createdAt: "2026-07-01T00:00:00.000Z",
            updatedAt: "2026-07-01T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/reports/summary")) {
        return Promise.resolve(
          jsonResponse({
            organizationId: "org_1",
            assessments: {
              total: 0,
              byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0 },
              byFramework: {},
              latestAssessmentAt: null,
            },
            generatedAt: "2026-07-21T00:00:00.000Z",
          }),
        );
      }
      if (url.includes("/api/portal/activity")) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <MemoryRouter>
        <PortalDashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Run a new scan →" })).toHaveAttribute(
      "href",
      "/portal/dpdp-scanner",
    );
  });
});
