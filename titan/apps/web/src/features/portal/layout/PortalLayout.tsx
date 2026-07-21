import { Outlet } from "react-router-dom";
import { Alert } from "@titan/design-system";
import { Header } from "../../../components/Header.js";
import { Sidebar } from "../../../components/Sidebar.js";
import { Footer } from "../../../components/Footer.js";
import "../../../app/Layout.css";
import { useSession } from "../../admin/auth/SessionContext.js";
import { signOutUrl } from "../../admin/auth/authUrls.js";
import { Breadcrumbs } from "../../admin/layout/Breadcrumbs.js";
import { hasPortalOrganizationMembership, portalNavItems } from "./portalNavItems.js";

/**
 * The Customer Portal's own shell — reuses the exact same Header/Sidebar/
 * Footer/Breadcrumbs primitives `AdminLayout` does (real, tested,
 * accessible; no duplicate shell components — `ARCHITECTURE.md`'s own
 * "admin/customer-portal shell" note anticipated exactly this reuse since
 * EAP-1), but with `portalNavItems` instead of `adminNavItems`. Rendered
 * inside `RequireAuth`, so by the time this mounts `useSession()` is always
 * `"authenticated"` — a real session is not the same thing as a real
 * organization membership, though, so this layout (not `RequireAuth`,
 * which is deliberately role-agnostic) is where that honest distinction is
 * drawn: an authenticated caller with no organization membership sees a
 * clear, real message instead of a portal page that would just 403 every
 * request it made.
 */
export function PortalLayout() {
  const session = useSession();
  const me = session.status === "authenticated" ? session.me : null;
  const hasMembership = me ? hasPortalOrganizationMembership(me) : false;

  return (
    <div className="titan-layout">
      <a href="#main-content" className="titan-skip-link">
        Skip to main content
      </a>
      <Header session={me ? { email: me.email, signOutHref: signOutUrl("/") } : undefined} />
      <div className="titan-layout__body">
        <Sidebar items={me ? portalNavItems(me) : []} />
        <div className="titan-layout__content">
          <main id="main-content">
            <Breadcrumbs />
            {hasMembership ? (
              <Outlet />
            ) : (
              <Alert variant="info" title="No organization membership">
                Your account isn&apos;t linked to an organization yet, so there&apos;s nothing to
                show here. Contact your organization&apos;s administrator to be added.
              </Alert>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
