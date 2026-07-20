import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renders its label and responds to click", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save changes</Button>);

    const button = screen.getByRole("button", { name: "Save changes" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard-activatable (native button semantics)", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Submit</Button>);

    await user.tab();
    expect(screen.getByRole("button", { name: "Submit" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Submit
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("marks itself busy and non-interactive while loading, without removing the accessible name", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} isLoading>
        Submit
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(["primary", "secondary", "danger", "ghost"] as const)(
    "applies the %s variant class",
    (variant) => {
      render(<Button variant={variant}>Action</Button>);
      expect(screen.getByRole("button")).toHaveClass(`titan-btn--${variant}`);
    },
  );

  it("has no detectable accessibility violations (structural — see DEVELOPER_GUIDE.md for what this does and doesn't check)", async () => {
    const { container } = render(<Button>Accessible button</Button>);
    // color-contrast disabled: jsdom doesn't render real pixels/canvas, so
    // this axe-core rule can't evaluate actual contrast here — it would
    // either silently no-op or throw a "not implemented" canvas error
    // depending on the check path. Real contrast validation needs a real
    // browser (see DEVELOPER_GUIDE.md).
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
