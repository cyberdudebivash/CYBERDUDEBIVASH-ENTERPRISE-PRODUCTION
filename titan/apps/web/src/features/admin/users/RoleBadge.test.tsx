import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBadge } from "./RoleBadge.js";

describe("RoleBadge", () => {
  it("renders a label for owner", () => {
    render(<RoleBadge userRole="owner" />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders a label for admin", () => {
    render(<RoleBadge userRole="admin" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders a label for member", () => {
    render(<RoleBadge userRole="member" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("renders 'Platform Administrator' instead of the raw role when isPlatformAdministrator is true", () => {
    render(<RoleBadge userRole="owner" isPlatformAdministrator />);
    expect(screen.getByText("Platform Administrator")).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
  });
});
