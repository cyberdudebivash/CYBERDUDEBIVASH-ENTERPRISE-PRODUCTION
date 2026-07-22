import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge.js";

describe("SubscriptionStatusBadge", () => {
  it("renders a real label for every SubscriptionStatus value", () => {
    render(
      <>
        <SubscriptionStatusBadge status="trialing" />
        <SubscriptionStatusBadge status="active" />
        <SubscriptionStatusBadge status="canceled" />
        <SubscriptionStatusBadge status="expired" />
      </>,
    );
    expect(screen.getByText("Trialing")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Canceled")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});
