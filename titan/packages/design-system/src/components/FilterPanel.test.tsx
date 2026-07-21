import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { FilterPanel } from "./FilterPanel.js";

const statusField = {
  id: "status",
  label: "Status",
  value: "",
  options: [
    { value: "new", label: "New" },
    { value: "qualified", label: "Qualified" },
  ],
};

describe("FilterPanel", () => {
  it("renders a labeled select per field, plus an 'All' option", () => {
    render(<FilterPanel fields={[statusField]} onChange={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Status" });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Qualified" })).toBeInTheDocument();
  });

  it("reflects the field's current value", () => {
    render(<FilterPanel fields={[{ ...statusField, value: "qualified" }]} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("qualified");
  });

  it("calls onChange with the field id and the selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterPanel fields={[statusField]} onChange={onChange} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "qualified");
    expect(onChange).toHaveBeenCalledWith("status", "qualified");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<FilterPanel fields={[statusField]} onChange={() => {}} />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
