import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Timeline } from "./Timeline.js";

const entries = [
  { id: "1", label: "Status changed", detail: "new → qualified", timestamp: "20 Jul 2026, 21:00" },
  { id: "2", label: "Lead created", timestamp: "19 Jul 2026, 09:00" },
];

describe("Timeline", () => {
  it("renders each entry's label, detail, and timestamp, in order", () => {
    render(<Timeline entries={entries} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Status changed");
    expect(items[0]).toHaveTextContent("new → qualified");
    expect(items[0]).toHaveTextContent("20 Jul 2026, 21:00");
  });

  it("renders without a detail when none is given", () => {
    render(<Timeline entries={[{ id: "1", label: "Lead created", timestamp: "19 Jul 2026" }]} />);
    expect(screen.getByText("Lead created")).toBeInTheDocument();
  });

  it("shows an empty-state message instead of an empty list", () => {
    render(<Timeline entries={[]} emptyLabel="No activity recorded yet." />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Timeline entries={entries} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
