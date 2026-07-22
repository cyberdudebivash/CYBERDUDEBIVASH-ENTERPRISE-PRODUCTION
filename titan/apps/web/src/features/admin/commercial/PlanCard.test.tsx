import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { PlanCard } from "./PlanCard.js";
import { findPlan } from "@titan/platform";

const professional = findPlan("professional")!;

describe("PlanCard", () => {
  it("renders the real plan name, price, and entitlements", () => {
    render(<PlanCard plan={professional} />);
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("$1,499/month")).toBeInTheDocument();
    expect(screen.getByText(/50 seats/)).toBeInTheDocument();
  });

  it("shows a real 'Current plan' indicator when isCurrent is set", () => {
    render(<PlanCard plan={professional} isCurrent />);
    expect(screen.getByText("Current plan")).toBeInTheDocument();
  });

  it("renders no action at all when onSelect is omitted", () => {
    render(<PlanCard plan={professional} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onSelect when a real user clicks the action button", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PlanCard plan={professional} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Choose Professional" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<PlanCard plan={professional} onSelect={() => {}} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
