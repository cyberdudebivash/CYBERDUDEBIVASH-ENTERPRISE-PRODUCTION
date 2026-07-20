import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Panel } from "./Panel.js";

describe("Panel", () => {
  it("renders as a labeled section with the given title and content", () => {
    render(
      <Panel title="Recent activity">
        <p>Nothing yet.</p>
      </Panel>,
    );
    const section = screen.getByRole("region", { name: "Recent activity" });
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
  });

  it("renders an optional action alongside the title", () => {
    render(
      <Panel title="Leads" action={<a href="/admin/leads">View all</a>}>
        content
      </Panel>,
    );
    expect(screen.getByRole("link", { name: "View all" })).toBeInTheDocument();
  });

  it("gives each panel instance its own unique heading id (no aria-labelledby collisions)", () => {
    render(
      <>
        <Panel title="First">a</Panel>
        <Panel title="Second">b</Panel>
      </>,
    );
    const first = screen.getByRole("region", { name: "First" });
    const second = screen.getByRole("region", { name: "Second" });
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <Panel title="Platform health">
        <p>All systems operational.</p>
      </Panel>,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
