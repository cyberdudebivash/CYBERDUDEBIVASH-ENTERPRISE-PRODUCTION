import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntitlementBadge } from "./EntitlementBadge.js";

describe("EntitlementBadge", () => {
  it("renders the real label regardless of enabled state", () => {
    render(
      <>
        <EntitlementBadge label="Priority support" enabled />
        <EntitlementBadge label="Compliance report export" enabled={false} />
      </>,
    );
    expect(screen.getByText(/Priority support/)).toBeInTheDocument();
    expect(screen.getByText(/Compliance report export/)).toBeInTheDocument();
  });
});
