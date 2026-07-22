import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OperationalAlert } from "@titan/platform";
import { AlertsPanel } from "./AlertsPanel.js";

function makeAlert(overrides: Partial<OperationalAlert> = {}): OperationalAlert {
  return {
    id: "readiness.not_ready",
    severity: "critical",
    message: "Readiness check is failing",
    evidence: {},
    ...overrides,
  };
}

describe("AlertsPanel", () => {
  it("shows an honest success state, not a fabricated one, when no alerts are firing", () => {
    render(<AlertsPanel alerts={[]} />);
    expect(screen.getByText("No alerts firing")).toBeInTheDocument();
  });

  it("renders a critical alert's real message and severity", () => {
    render(<AlertsPanel alerts={[makeAlert({ message: 'Service "audit" is unreachable' })]} />);
    expect(screen.getByText('Service "audit" is unreachable')).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders a warning alert distinctly from a critical one", () => {
    render(
      <AlertsPanel
        alerts={[
          makeAlert({
            id: "latency.p95.warning",
            severity: "warning",
            message: "p95 latency high",
          }),
        ]}
      />,
    );
    expect(screen.getByText("p95 latency high")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
  });

  it("renders every alert in a multi-alert snapshot, not just the first", () => {
    render(
      <AlertsPanel
        alerts={[
          makeAlert({ id: "a", message: "First alert" }),
          makeAlert({ id: "b", message: "Second alert", severity: "warning" }),
        ]}
      />,
    );
    expect(screen.getByText("First alert")).toBeInTheDocument();
    expect(screen.getByText("Second alert")).toBeInTheDocument();
  });
});
