import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SearchBar } from "./SearchBar.js";

describe("SearchBar", () => {
  it("renders the label and current value", () => {
    render(<SearchBar label="Search leads" value="acme" onChange={() => {}} />);
    expect(screen.getByRole("searchbox", { name: "Search leads" })).toHaveValue("acme");
  });

  it("calls onChange as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar label="Search leads" value="" onChange={onChange} />);
    await user.type(screen.getByRole("searchbox", { name: "Search leads" }), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <SearchBar label="Search leads" value="" onChange={() => {}} placeholder="Name, email…" />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
