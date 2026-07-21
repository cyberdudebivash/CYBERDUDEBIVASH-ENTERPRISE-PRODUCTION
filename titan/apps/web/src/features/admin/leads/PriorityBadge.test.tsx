import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityBadge } from "./PriorityBadge.js";

describe("PriorityBadge", () => {
  it("renders a real label for every LeadPriority value", () => {
    render(
      <>
        <PriorityBadge priority="low" />
        <PriorityBadge priority="medium" />
        <PriorityBadge priority="high" />
        <PriorityBadge priority="urgent" />
      </>,
    );
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });
});
