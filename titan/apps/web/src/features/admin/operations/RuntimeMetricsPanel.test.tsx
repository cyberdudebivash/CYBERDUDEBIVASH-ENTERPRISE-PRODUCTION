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
});
