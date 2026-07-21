import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SystemOverviewPanel } from "./SystemOverviewPanel.js";

describe("SystemOverviewPanel", () => {
  it("renders the real version, environment, and module list", () => {
    render(
      <SystemOverviewPanel
        overview={{
          version: "0.1.0",
          environment: "local development (never deployed)",
          modules: ["leads", "assessments", "audit"],
        }}
      />,
    );
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("local development (never deployed)")).toBeInTheDocument();
    expect(screen.getByText("leads, assessments, audit")).toBeInTheDocument();
  });
});
