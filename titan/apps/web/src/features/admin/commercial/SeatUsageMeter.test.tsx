import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeatUsageMeter } from "./SeatUsageMeter.js";

describe("SeatUsageMeter", () => {
  it("renders the real seat counts and a real accessible progressbar", () => {
    render(<SeatUsageMeter seatsUsed={7} seatLimit={10} />);
    expect(screen.getByText("7 / 10")).toBeInTheDocument();
    const progressbar = screen.getByRole("progressbar", { name: "7 of 10 seats used" });
    expect(progressbar).toHaveAttribute("aria-valuenow", "7");
    expect(progressbar).toHaveAttribute("aria-valuemax", "10");
  });

  it("does not throw when seats used exceeds the limit", () => {
    render(<SeatUsageMeter seatsUsed={12} seatLimit={10} />);
    expect(screen.getByText("12 / 10")).toBeInTheDocument();
  });
});
