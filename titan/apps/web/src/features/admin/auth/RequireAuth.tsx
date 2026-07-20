import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Alert } from "@titan/design-system";
import { useSession } from "./SessionContext.js";
import { signInUrl } from "./authUrls.js";
import "./RequireAuth.css";

/**
 * Protected-route middleware for `/admin/*`. Any real, authenticated
 * session is enough to pass — role-specific gating happens per feature
 * (the Dashboard's own sections check `isPlatformAdministrator`), not here,
 * since a future module may have real content for a non-platform-admin
 * organization role.
 *
 * The unauthenticated redirect is a real browser navigation
 * (`window.location.href`), not client-side routing: the destination is
 * Auth.js's own hosted sign-in page on the Worker's origin, a different
 * origin React Router has no way to navigate to.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  const callbackPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (session.status === "unauthenticated") {
      window.location.href = signInUrl(callbackPath);
    }
  }, [session.status, callbackPath]);

  if (session.status === "loading" || session.status === "unauthenticated") {
    // Same state covers "still checking" and "about to redirect" — both are
    // genuinely transient, and there's nothing more specific to tell the
    // user in the moment before a full-page navigation happens anyway.
    return (
      <div className="titan-admin-loading" role="status">
        <span className="titan-admin-loading__spinner" aria-hidden="true" />
        <p>Checking your session…</p>
      </div>
    );
  }

  if (session.status === "error") {
    return (
      <div className="titan-admin-loading">
        <Alert variant="error" title="Could not verify your session">
          {session.message}
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
