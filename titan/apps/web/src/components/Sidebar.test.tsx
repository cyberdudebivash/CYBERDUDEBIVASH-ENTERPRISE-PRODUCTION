import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";

describe("Sidebar", () => {
  it("renders every item it's given as a navigation link", () => {
    render(
      <MemoryRouter>
        <Sidebar
          items={[
            { label: "Home", to: "/" },
            { label: "Reports", to: "/reports" },
          ]}
        />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
  });

  it("marks the current route's link as active", () => {
    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <Sidebar
          items={[
            { label: "Home", to: "/" },
            { label: "Reports", to: "/reports" },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Reports" })).toHaveClass(
      "titan-sidebar__link--active",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveClass(
      "titan-sidebar__link--active",
    );
  });

  it("renders nothing but the nav landmark when given no items", () => {
    render(
      <MemoryRouter>
        <Sidebar items={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
