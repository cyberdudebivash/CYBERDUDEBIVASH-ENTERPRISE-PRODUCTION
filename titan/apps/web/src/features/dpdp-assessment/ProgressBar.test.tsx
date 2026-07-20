import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ProgressBar } from "./ProgressBar.js";

describe("ProgressBar", () => {
  it("exposes progress via a real progressbar role, not just visually", () => {
    render(<ProgressBar current={4} total={15} />);
    const bar = screen.getByRole("progressbar", { name: "Assessment progress" });
    // (4 - 1) / 15 = 20%
    expect(bar).toHaveAttribute("aria-valuenow", "20");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the question count and percentage as visible text", () => {
    render(<ProgressBar current={4} total={15} />);
    expect(screen.getByText("Question 4 of 15")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(<ProgressBar current={1} total={15} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
