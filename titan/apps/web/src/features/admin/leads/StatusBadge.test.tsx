import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge.js";

describe("StatusBadge", () => {
  it("renders a real label for every LeadStatus value", () => {
    render(
      <>
        <StatusBadge status="new" />
        <StatusBadge status="contacted" />
        <StatusBadge status="qualified" />
        <StatusBadge status="disqualified" />
        <StatusBadge status="converted" />
      </>,
    );
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Contacted")).toBeInTheDocument();
    expect(screen.getByText("Qualified")).toBeInTheDocument();
    expect(screen.getByText("Disqualified")).toBeInTheDocument();
    expect(screen.getByText("Converted")).toBeInTheDocument();
  });
});
