import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TrendSparkline } from "./TrendSparkline.js";

const points = [
  { date: "2026-07-15", count: 0 },
  { date: "2026-07-16", count: 2 },
  { date: "2026-07-17", count: 5 },
];

describe("TrendSparkline", () => {
  it("renders a real, data-derived accessible label", () => {
    render(<TrendSparkline points={points} label="Lead trend" />);
    expect(
      screen.getByRole("img", {
        name: "Lead trend: 7 total over 3 days, 5 on the most recent day",
      }),
    ).toBeInTheDocument();
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(<TrendSparkline points={[]} label="Lead trend" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a flat line without dividing by zero when every count is 0", () => {
    const flat = [
      { date: "2026-07-15", count: 0 },
      { date: "2026-07-16", count: 0 },
    ];
    render(<TrendSparkline points={flat} label="Lead trend" />);
    expect(
      screen.getByRole("img", {
        name: "Lead trend: 0 total over 2 days, 0 on the most recent day",
      }),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<TrendSparkline points={points} label="Lead trend" />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
