import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ServiceStatus } from "@titan/platform";
import { ServiceStatusPanel } from "./ServiceStatusPanel.js";

function makeService(overrides: Partial<ServiceStatus> = {}): ServiceStatus {
  return {
    name: "leads",
    configured: true,
    ok: true,
    latencyMs: 3,
    total: 42,
    ...overrides,
  };
}

describe("ServiceStatusPanel", () => {
  it("renders an Operational badge and real row count for a healthy service", () => {
    render(<ServiceStatusPanel services={[makeService()]} />);
    const table = within(screen.getByRole("table", { name: "Service status" }));
    expect(table.getByText("Lead Platform")).toBeInTheDocument();
    expect(table.getByText("Operational")).toBeInTheDocument();
    expect(table.getByText("3 ms")).toBeInTheDocument();
    expect(table.getByText("42")).toBeInTheDocument();
  });

  it("renders an Unreachable badge and the real error for a configured-but-failing service", () => {
    render(
      <ServiceStatusPanel
        services={[makeService({ ok: false, total: undefined, error: "D1_ERROR: timeout" })]}
      />,
    );
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
    expect(screen.getByText("D1_ERROR: timeout")).toBeInTheDocument();
  });

  it("renders a Not configured badge for a service this deployment doesn't wire", () => {
    render(
      <ServiceStatusPanel
        services={[
          makeService({
            name: "organizations",
            configured: false,
            ok: false,
            latencyMs: undefined,
            total: undefined,
          }),
        ]}
      />,
    );
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.getByText("No dependency wired")).toBeInTheDocument();
  });
});
