import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuntimeMetricsPanel } from "./RuntimeMetricsPanel.js";

describe("RuntimeMetricsPanel", () => {
  it("renders real request counts by method/path/status", () => {
    render(
      <RuntimeMetricsPanel
        requestCounts={[
          {
            name: "http.request",
            tags: { method: "GET", path: "/api/audit", status: "200" },
            count: 3,
          },
        ]}
        repositoryOperations={[]}
      />,
    );
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("/api/audit")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("computes a real average and max from repository operation durations", () => {
    render(
      <RuntimeMetricsPanel
        requestCounts={[]}
        repositoryOperations={[
          {
            name: "repository.duration_ms",
            tags: { operation: "leads.search" },
            durations: [2, 4, 12],
          },
        ]}
      />,
    );
    expect(screen.getByText("leads.search")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // sample count
    expect(screen.getByText("6 ms")).toBeInTheDocument(); // average of 2,4,12 = 6
    expect(screen.getByText("12 ms")).toBeInTheDocument(); // max
  });

  it("shows an honest empty state, not a fabricated zero row, when nothing has been recorded", () => {
    render(<RuntimeMetricsPanel requestCounts={[]} repositoryOperations={[]} />);
    expect(screen.getByText("No requests recorded yet")).toBeInTheDocument();
    expect(screen.getByText("No repository operations recorded yet")).toBeInTheDocument();
  });

  it("does not render a Request health section at all when requestSummary is absent", () => {
    render(<RuntimeMetricsPanel requestCounts={[]} repositoryOperations={[]} />);
    expect(screen.queryByText("Request health")).not.toBeInTheDocument();
  });

  it("OPS-1: renders real error rate and latency percentiles when requestSummary is present", () => {
    render(
      <RuntimeMetricsPanel
        requestCounts={[]}
        repositoryOperations={[]}
        requestSummary={{
          errorRate: {
            total: 20,
            serverErrors: 1,
            clientErrors: 2,
            serverErrorRate: 0.05,
            clientErrorRate: 0.1,
          },
          latency: { count: 20, p50: 10, p95: 40, p99: 55 },
          repositoryLatency: { count: 0, p50: 0, p95: 0, p99: 0 },
        }}
      />,
    );
    expect(screen.getByText("Request health")).toBeInTheDocument();
    expect(screen.getByText("5.0%")).toBeInTheDocument();
    expect(screen.getByText("10.0%")).toBeInTheDocument();
    expect(screen.getByText("40 ms")).toBeInTheDocument();
  });

  it("OPS-1: shows an honest empty state for request health when no requests have landed yet", () => {
    render(
      <RuntimeMetricsPanel
        requestCounts={[]}
        repositoryOperations={[]}
        requestSummary={{
          errorRate: {
            total: 0,
            serverErrors: 0,
            clientErrors: 0,
            serverErrorRate: 0,
            clientErrorRate: 0,
          },
          latency: { count: 0, p50: 0, p95: 0, p99: 0 },
          repositoryLatency: { count: 0, p50: 0, p95: 0, p99: 0 },
        }}
      />,
    );
    expect(
      screen.getByText(
        "Error rate and latency percentiles need at least one recorded request on this isolate.",
      ),
    ).toBeInTheDocument();
  });
});
