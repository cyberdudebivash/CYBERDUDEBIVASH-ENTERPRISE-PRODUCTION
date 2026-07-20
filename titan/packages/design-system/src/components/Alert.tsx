import type { ReactNode } from "react";
import "./Alert.css";

export type AlertVariant = "success" | "warning" | "error" | "info";

export interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}

/**
 * error/warning use an assertive live region (role="alert") since they need
 * to interrupt; success/info use a polite one (role="status") so a screen
 * reader user isn't interrupted for routine confirmations. This distinction
 * is deliberate, not arbitrary — see WAI-ARIA live region guidance.
 */
export function Alert({ variant, title, children, onDismiss }: AlertProps) {
  const role = variant === "error" || variant === "warning" ? "alert" : "status";

  return (
    <div className={`titan-alert titan-alert--${variant}`} role={role}>
      <div className="titan-alert__body">
        {title && <p className="titan-alert__title">{title}</p>}
        <div className="titan-alert__message">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="titan-alert__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
