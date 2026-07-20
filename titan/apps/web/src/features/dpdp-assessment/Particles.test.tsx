import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Particles } from "./Particles.js";

describe("Particles", () => {
  it("is hidden from the accessibility tree", () => {
    const { container } = render(<Particles />);
    expect(container.querySelector(".dpdp-particles")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders 30 decorative particles", () => {
    const { container } = render(<Particles />);
    expect(container.querySelectorAll(".dpdp-particle")).toHaveLength(30);
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(<Particles />);
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
