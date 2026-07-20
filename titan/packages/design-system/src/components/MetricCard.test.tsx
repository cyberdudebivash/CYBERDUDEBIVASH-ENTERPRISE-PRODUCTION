import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MetricCard } from "./MetricCard.js";

describe("MetricCard", () => {
  it("renders the label and value", () => {
    render(<MetricCard label="Organizations" value={12} />);
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders an optional hint", () => {
    render(<MetricCard label="Leads" value={3} hint="Last 30 days" />);
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("renders no hint when one isn't provided", () => {
    render(<MetricCard label="Leads" value={3} />);
    expect(screen.queryByText(/last/i)).not.toBeInTheDocument();
  });

  it("shows a loading placeholder instead of the value, marked aria-busy, while isLoading", () => {
    render(<MetricCard label="Assessments" value={7} isLoading />);
    expect(screen.queryByText("7")).not.toBeInTheDocument();
    expect(screen.getByText("Assessments").nextElementSibling).toHaveAttribute("aria-busy", "true");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<MetricCard label="Organizations" value={12} hint="Active" />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
