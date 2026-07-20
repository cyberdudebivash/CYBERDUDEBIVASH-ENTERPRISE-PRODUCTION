import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App.js";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  it("renders the home page at /", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Titan platform foundation" })).toBeInTheDocument();
  });

  it("renders NotFound for an unmatched path", () => {
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("always renders the shell (header, nav, footer) around the page content", () => {
    renderAt("/");
    expect(screen.getByText("Titan")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByText(/CyberDudeBivash Pvt\. Ltd\./)).toBeInTheDocument();
  });

  it("has a working skip link to the main content landmark", () => {
    renderAt("/");
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });

  it("navigates via the sidebar without a full page reload", async () => {
    const user = userEvent.setup();
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("heading", { name: "Titan platform foundation" })).toBeInTheDocument();
  });

  it("renders the DPDP assessment at its own route, outside the admin shell", () => {
    renderAt("/assessment/dpdp");
    expect(screen.getByRole("heading", { name: /Is Your Startup/ })).toBeInTheDocument();
    // Not wrapped in Layout: no header "Titan" wordmark, no sidebar nav landmark.
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });
});
