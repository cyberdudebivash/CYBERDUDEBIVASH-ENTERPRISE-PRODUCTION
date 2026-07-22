import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationsWorkspaceContent } from "./OperationsWorkspacePage.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function mockFetch() {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/health/ready")) {
      return Promise.resolve(jsonResponse({ status: "ready", service: "titan-platform" }));
    }
    if (url.includes("/health")) {
      return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
    }
    if (url.includes("/api/operations/summary")) {
      return Promise.resolve(
        jsonResponse({
          services: [
            { name: "leads", configured: true, ok: true, latencyMs: 2, total: 5 },
            { name: "organizations", configured: false, ok: false },
          ],
          requestCounts: [
            {
              name: "http.request",
              tags: { method: "GET", path: "/api/audit", status: "200" },
              count: 1,
            },
          ],
          repositoryOperations: [
            { name: "repository.duration_ms", tags: { operation: "leads.search" }, durations: [4] },
          ],
          overview: {
            version: "0.1.0",
            environment: "local development (never deployed)",
            modules: ["leads", "assessments", "audit"],
          },
          requestSummary: {
            errorRate: {
              total: 1,
              serverErrors: 0,
              clientErrors: 0,
              serverErrorRate: 0,
              clientErrorRate: 0,
            },
            latency: { count: 1, p50: 4, p95: 4, p99: 4 },
            repositoryLatency: { count: 1, p50: 4, p95: 4, p99: 4 },
          },
          alerts: [],
        }),
      );
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

describe("OperationsWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders real health, readiness, service status, metrics, and overview for a Platform Administrator", async () => {
    mockFetch();
    render(
      <OperationsWorkspaceContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    expect(await screen.findByText(/titan-platform: ok/)).toBeInTheDocument();
    expect(await screen.findByText(/titan-platform: ready/)).toBeInTheDocument();
    expect(await screen.findByText("Lead Platform")).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No background job, queue, or scheduled-task infrastructure exists in this deployment.",
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
    // OPS-1: the operational summary banner and Alerts panel both reflect
    // the real (empty) `alerts` array the mocked summary above returns.
    expect(await screen.findByText("Healthy — no alerts firing")).toBeInTheDocument();
    expect(screen.getByText("No alerts firing")).toBeInTheDocument();
    expect(screen.getByText("Request health")).toBeInTheDocument();
  });

  it("OPS-1: the operational summary banner reflects a real critical alert, not just the healthy default", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/health/ready")) {
        return Promise.resolve(jsonResponse({ status: "ready", service: "titan-platform" }));
      }
      if (url.includes("/health")) {
        return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
      }
      if (url.includes("/api/operations/summary")) {
        return Promise.resolve(
          jsonResponse({
            services: [{ name: "leads", configured: true, ok: true, latencyMs: 2, total: 5 }],
            requestCounts: [],
            repositoryOperations: [],
            overview: { version: "0.1.0", environment: "production", modules: ["leads"] },
            requestSummary: {
              errorRate: {
                total: 0,
                serverErrors: 0,
                clientErrors: 0,
                serverErrorRate: 0,
                clientErrorRate: 0,
              },
              latency: { count: 0, p50: 0, p95: 0, p99: 0 },
              repositoryLatency: { count: 0, p50: 0, p95: 0, p99: 0 },
            },
            alerts: [
              {
                id: "service.unreachable.audit",
                severity: "critical",
                message: 'Service "audit" is configured but unreachable',
                evidence: {},
              },
            ],
          }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <OperationsWorkspaceContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    expect(
      await screen.findByText("Critical — one or more thresholds breached"),
    ).toBeInTheDocument();
    expect(screen.getByText('Service "audit" is configured but unreachable')).toBeInTheDocument();
  });

  it("shows an honest 'Platform Administrator role required' message for a non-admin, but still shows role-agnostic health", async () => {
    mockFetch();
    render(
      <OperationsWorkspaceContent
        me={{ userId: "u2", email: "member@acme.in", profiles: [], isPlatformAdministrator: false }}
      />,
    );

    expect(await screen.findByText(/titan-platform: ok/)).toBeInTheDocument();
    expect(
      screen.getAllByText("Platform Administrator role required to view this.").length,
    ).toBeGreaterThan(0);
  });

  it("shows a real error alert when the summary request fails", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/health")) {
        return Promise.resolve(jsonResponse({ status: "ok", service: "titan-platform" }));
      }
      if (url.includes("/api/operations/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Internal server error" } }), {
            status: 500,
          }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    render(
      <OperationsWorkspaceContent
        me={{ userId: "u1", email: "admin@acme.in", profiles: [], isPlatformAdministrator: true }}
      />,
    );

    expect(await screen.findAllByText("Could not load this data")).not.toHaveLength(0);
  });
});
