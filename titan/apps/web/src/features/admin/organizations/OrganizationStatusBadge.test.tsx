import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrganizationStatusBadge } from "./OrganizationStatusBadge.js";

describe("OrganizationStatusBadge", () => {
  it("renders a label for active", () => {
    render(<OrganizationStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders a label for archived", () => {
    render(<OrganizationStatusBadge status="archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});
