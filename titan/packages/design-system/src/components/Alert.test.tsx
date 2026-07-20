import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Alert } from "./Alert.js";

describe("Alert", () => {
  it("renders title and message content", () => {
    render(
      <Alert variant="info" title="Heads up">
        Your session will expire soon.
      </Alert>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Your session will expire soon.")).toBeInTheDocument();
  });

  it.each(["error", "warning"] as const)(
    "uses an assertive live region (role=alert) for the %s variant",
    (variant) => {
      render(<Alert variant={variant}>Message</Alert>);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    },
  );

  it.each(["success", "info"] as const)(
    "uses a polite live region (role=status) for the %s variant",
    (variant) => {
      render(<Alert variant={variant}>Message</Alert>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    },
  );

  it("calls onDismiss when the dismiss button is activated", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <Alert variant="success" onDismiss={onDismiss}>
        Saved.
      </Alert>,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders no dismiss control when onDismiss is not provided", () => {
    render(<Alert variant="info">Informational only.</Alert>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations (structural — see DEVELOPER_GUIDE.md for what this does and doesn't check)", async () => {
    const { container } = render(
      <Alert variant="warning" title="Check this">
        Some fields need attention.
      </Alert>,
    );
    // color-contrast disabled: see Button.test.tsx — jsdom can't evaluate real contrast.
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
