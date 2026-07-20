import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AssessmentResult } from "@titan/assessment-core";
import { DashboardContent } from "./DashboardPage.js";

const sampleResult: AssessmentResult = {
  score: 50,
  riskLevel: "medium",
  breakdown: { critical: 0, high: 1, medium: 1, low: 10, total: 2 },
  gaps: [],
  scoredQuestionCount: 12,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, status);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real counts and risk breakdowns for a Platform Administrator", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/leads")) {
        return Promise.resolve(
          jsonResponse([
            {
              id: "l1",
              name: "A",
              email: "a@x.com",
              company: "A Co",
              answers: {},
              result: { ...sampleResult, riskLevel: "critical" },
              timestamp: "t",
              source: "s",
              organizationId: null,
              assessmentId: null,
            },
          ]),
        );
      }
      if (url.includes("/api/assessments")) {
        return Promise.resolve(
          jsonResponse([
            {
              id: "a1",
              organizationId: null,
              createdBy: null,
              framework: "dpdp",
              frameworkVersion: "1.0.0",
              answers: {},
              result: { ...sampleResult, riskLevel: "high" },
              createdAt: "t",
            },
          ]),
        );
      }
      if (url.includes("/api/organizations")) {
        return Promise.resolve(
          jsonResponse([{ id: "o1", name: "Acme", slug: "acme", createdAt: "t" }]),
        );
      }
      if (url.includes("/api/audit")) {
        return Promise.resolve(
          jsonResponse([
            {
              id: "e1",
              actorId: null,
              organizationId: null,
              action: "lead.created",
              entityType: "lead",
              entityId: "l1",
              metadata: null,
              createdAt: "2026-07-20T00:00:00.000Z",
            },
          ]),
        );
      }
      if (url.includes("/health/ready")) {
        return Promise.resolve(jsonResponse({ status: "ready", service: "titan-platform" }));
      }
      if (url.includes("/health")) {
        return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <DashboardContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    expect(await screen.findAllByText("1", { selector: ".titan-metric-card__value" })).toHaveLength(
      3,
    );
    // "critical" is a fixed label rendered in both the lead and assessment
    // risk-breakdown panels regardless of data, so it's expected twice.
    expect(screen.getAllByText("critical")).toHaveLength(2);
    // Same audit event backs both the Recent Activity feed and the Audit
    // Summary counts, so its action name is expected to appear in both.
    expect(screen.getAllByText("lead.created")).toHaveLength(2);
    expect(await screen.findByText(/titan-platform: ok/)).toBeInTheDocument();
    expect(screen.getByText(/titan-platform: ready/)).toBeInTheDocument();
  });

  it("shows a clear, honest 'Platform Administrator required' message for gated sections, without firing those requests, for a non-platform-administrator", async () => {
    const calledPaths: string[] = [];
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      calledPaths.push(url);
      if (url.includes("/health/ready"))
        return Promise.resolve(jsonResponse({ status: "ready", service: "titan-platform" }));
      if (url.includes("/health"))
        return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
      return Promise.reject(new Error(`unexpected fetch for non-admin: ${url}`));
    });

    render(
      <DashboardContent
        me={{ userId: "u2", email: "member@acme.in", profiles: [], isPlatformAdministrator: false }}
      />,
    );

    expect(
      await screen.findAllByText("Platform Administrator role required to view this."),
    ).toHaveLength(4);
    expect(calledPaths.some((p) => p.includes("/api/leads"))).toBe(false);
    expect(calledPaths.some((p) => p.includes("/api/organizations"))).toBe(false);
    // Health/readiness are role-agnostic and still load for everyone.
    expect(await screen.findByText(/titan-platform: ok/)).toBeInTheDocument();
  });

  it("shows a real error for one failing section without blocking the others from rendering", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/audit")) {
        return Promise.resolve(errorResponse(500, "internal_error", "Internal server error"));
      }
      if (url.includes("/api/leads")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/assessments")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/organizations")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/health/ready"))
        return Promise.resolve(jsonResponse({ status: "ready", service: "titan-platform" }));
      if (url.includes("/health"))
        return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <DashboardContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    // The failing section (audit) backs two panels — Recent Activity and
    // Audit Summary — so its real error correctly appears twice, not once.
    expect(await screen.findAllByText("Internal server error")).toHaveLength(2);
    // The other, successful sections still render their real (empty) state.
    expect(screen.getAllByText("No records yet.").length).toBeGreaterThan(0);
  });
});
