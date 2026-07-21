import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LoadingSkeleton } from "./LoadingSkeleton.js";

describe("LoadingSkeleton", () => {
  it("announces a single loading status, not once per placeholder line", () => {
    render(<LoadingSkeleton lines={5} />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("renders the requested number of placeholder lines", () => {
    const { container } = render(<LoadingSkeleton lines={4} />);
    expect(container.querySelectorAll(".titan-loading-skeleton__line")).toHaveLength(4);
  });

  it("defaults to 3 lines", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelectorAll(".titan-loading-skeleton__line")).toHaveLength(3);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<LoadingSkeleton />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
