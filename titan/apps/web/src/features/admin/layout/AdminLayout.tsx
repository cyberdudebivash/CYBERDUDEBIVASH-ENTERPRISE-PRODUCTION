import { Outlet } from "react-router-dom";
import { Header } from "../../../components/Header.js";
import { Sidebar } from "../../../components/Sidebar.js";
import { Footer } from "../../../components/Footer.js";
import "../../../app/Layout.css";
import { useSession } from "../auth/SessionContext.js";
import { signOutUrl } from "../auth/authUrls.js";
import { adminNavItems } from "./navItems.js";
import { Breadcrumbs } from "./Breadcrumbs.js";

/**
 * The authenticated admin shell — reuses the same Header/Sidebar/Footer
 * primitives the public `Layout` does (real, tested, accessible; no
 * duplicate shell components), but with a real signed-in session (header
 * identity + sign-out) and role-aware navigation instead of the public
 * shell's static one-item nav. Rendered inside `RequireAuth`, so by the
 * time this mounts `useSession()` is always `"authenticated"`.
 */
export function AdminLayout() {
  const session = useSession();
  const me = session.status === "authenticated" ? session.me : null;

  return (
    <div className="titan-layout">
      <a href="#main-content" className="titan-skip-link">
        Skip to main content
      </a>
      <Header session={me ? { email: me.email, signOutHref: signOutUrl("/") } : undefined} />
      <div className="titan-layout__body">
        <Sidebar items={me ? adminNavItems(me) : []} />
        <div className="titan-layout__content">
          <main id="main-content">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
