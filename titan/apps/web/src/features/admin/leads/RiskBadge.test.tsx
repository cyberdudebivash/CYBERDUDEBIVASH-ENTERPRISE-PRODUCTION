import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskBadge } from "./RiskBadge.js";

describe("RiskBadge", () => {
  it("renders a real label for every RiskLevel value", () => {
    render(
      <>
        <RiskBadge riskLevel="low" />
        <RiskBadge riskLevel="medium" />
        <RiskBadge riskLevel="high" />
        <RiskBadge riskLevel="critical" />
      </>,
    );
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
