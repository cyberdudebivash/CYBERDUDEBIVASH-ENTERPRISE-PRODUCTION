import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { EmptyState } from "./EmptyState.js";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No leads match these filters" />);
    expect(screen.getByRole("status")).toHaveTextContent("No leads match these filters");
  });

  it("renders an optional description and action", () => {
    render(
      <EmptyState
        title="No leads yet"
        description="Leads appear here once someone completes the assessment."
        action={<button type="button">Clear filters</button>}
      />,
    );
    expect(
      screen.getByText("Leads appear here once someone completes the assessment."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <EmptyState title="No leads yet" description="Nothing captured yet." />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
