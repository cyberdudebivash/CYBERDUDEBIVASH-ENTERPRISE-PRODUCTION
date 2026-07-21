import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuditEntityBadge } from "./AuditEntityBadge.js";

describe("AuditEntityBadge", () => {
  it("renders a link to the entity's own detail page for a known entity type", () => {
    render(
      <MemoryRouter>
        <AuditEntityBadge entityType="organization" entityId="org_1" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Organization" });
    expect(link).toHaveAttribute("href", "/admin/organizations/org_1");
  });

  it("renders a plain badge (no link) when entityId is null", () => {
    render(
      <MemoryRouter>
        <AuditEntityBadge entityType="lead" entityId={null} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a plain badge with the raw entityType for an unrecognized entity type", () => {
    render(
      <MemoryRouter>
        <AuditEntityBadge entityType="widget" entityId="widget_1" />
      </MemoryRouter>,
    );
    expect(screen.getByText("widget")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
