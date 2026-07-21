import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Badge } from "./Badge.js";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Qualified</Badge>);
    expect(screen.getByText("Qualified")).toBeInTheDocument();
  });

  it("defaults to the neutral tone", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("titan-badge--neutral");
  });

  it("applies the requested tone", () => {
    render(<Badge tone="error">Disqualified</Badge>);
    expect(screen.getByText("Disqualified")).toHaveClass("titan-badge--error");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Badge tone="success">Converted</Badge>);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
