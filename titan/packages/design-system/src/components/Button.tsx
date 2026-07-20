import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a busy state without unmounting label text — screen readers get aria-busy, not a silently vanishing button. */
  isLoading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    leadingIcon,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = ["titan-btn", `titan-btn--${variant}`, `titan-btn--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        // aria-hidden, not role="status"/aria-label: giving the spinner its
        // own accessible name merged it into the button's ("Loading Submit"
        // instead of "Submit") — caught by this component's own test suite.
        // aria-busy on the button itself is the correct signal for assistive tech.
        <span className="titan-btn__spinner" aria-hidden="true" />
      ) : (
        leadingIcon && (
          <span className="titan-btn__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )
      )}
      <span className={isLoading ? "titan-btn__label--loading" : undefined}>{children}</span>
    </button>
  );
});
