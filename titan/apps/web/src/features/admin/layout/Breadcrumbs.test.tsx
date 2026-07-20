import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs.js";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>,
  );
}

describe("Breadcrumbs", () => {
  it("renders nothing at a single-segment path (nothing to show a trail for)", () => {
    const { container } = renderAt("/admin");
    expect(container).toBeEmptyDOMElement();
  });

  it("derives a labeled trail from a nested path, title-casing hyphenated segments", () => {
    renderAt("/admin/lead-management/lead_1");
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Lead Management")).toBeInTheDocument();
    expect(screen.getByText("Lead_1")).toBeInTheDocument();
  });

  it("marks only the final segment as the current page", () => {
    renderAt("/admin/dashboard");
    expect(screen.getByText("Dashboard")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Admin" })).not.toHaveAttribute("aria-current");
  });

  it("links every segment except the current one", () => {
    renderAt("/admin/dashboard");
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link).toHaveAttribute("href", "/admin");
  });

  it("is a labeled navigation landmark", () => {
    renderAt("/admin/dashboard");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
});
