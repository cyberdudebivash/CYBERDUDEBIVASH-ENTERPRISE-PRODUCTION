import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FrameworkBadge } from "./FrameworkBadge.js";

describe("FrameworkBadge", () => {
  it("renders the framework name and version together", () => {
    render(<FrameworkBadge framework="DPDP Act 2023" frameworkVersion="1.0.0" />);
    expect(screen.getByText("DPDP Act 2023 v1.0.0")).toBeInTheDocument();
  });
});
