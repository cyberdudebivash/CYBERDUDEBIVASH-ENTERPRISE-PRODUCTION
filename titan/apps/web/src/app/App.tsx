import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary.js";
import { Home } from "../components/Home.js";
import { NotFound } from "../components/NotFound.js";
import { DpdpAssessmentPage } from "../features/dpdp-assessment/DpdpAssessmentPage.js";
import { Layout } from "./Layout.js";
import { SessionProvider } from "../features/admin/auth/SessionContext.js";
import { RequireAuth } from "../features/admin/auth/RequireAuth.js";
import { AdminLayout } from "../features/admin/layout/AdminLayout.js";
import { DashboardPage } from "../features/admin/dashboard/DashboardPage.js";
import { LeadWorkspacePage } from "../features/admin/leads/LeadWorkspacePage.js";
import { LeadDetailPage } from "../features/admin/leads/LeadDetailPage.js";
import { AssessmentWorkspacePage } from "../features/admin/assessments/AssessmentWorkspacePage.js";
import { AssessmentDetailPage } from "../features/admin/assessments/AssessmentDetailPage.js";
import { OrganizationWorkspacePage } from "../features/admin/organizations/OrganizationWorkspacePage.js";
import { OrganizationDetailPage } from "../features/admin/organizations/OrganizationDetailPage.js";
import { UserWorkspacePage } from "../features/admin/users/UserWorkspacePage.js";
import { UserDetailPage } from "../features/admin/users/UserDetailPage.js";
import { AuditWorkspacePage } from "../features/admin/audit/AuditWorkspacePage.js";
import { OperationsWorkspacePage } from "../features/admin/operations/OperationsWorkspacePage.js";
import { ReportingWorkspacePage } from "../features/admin/reporting/ReportingWorkspacePage.js";

/** Separated from App so tests can wrap it in MemoryRouter instead of BrowserRouter. */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public, unauthenticated conversion flow (PRODUCT_VISION.md: free
          assessment = top-of-funnel lead gen) — deliberately outside Layout's
          admin/customer-portal shell (Header/Sidebar/Footer), which ARCHITECTURE.md
          scopes to the authenticated app. Own branded look, own footer. */}
      <Route path="/assessment/dpdp" element={<DpdpAssessmentPage />} />
      {/* EAP-1: the real authenticated admin app — its own protected shell
          (AdminLayout), not the public Layout above. `SessionProvider` is
          scoped to just this subtree so the public routes never fire an
          unnecessary /api/me call. A literal "/admin" route (not a param or
          wildcard) always wins React Router's own path-ranking over the
          "*" fallback below, regardless of declaration order — declared
          first anyway, to read the same top-to-bottom order the routes
          actually resolve in. */}
      <Route
        path="/admin"
        element={
          <SessionProvider>
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          </SessionProvider>
        }
      >
        <Route index element={<DashboardPage />} />
        {/* EAP-2: the first module past Dashboard — Platform-Administrator-
            gated server-side (SECURITY_GUIDE.md), not by the route itself
            (RequireAuth only checks for a session, matching Dashboard's own
            precedent of showing an honest "forbidden" state per-section
            rather than blocking the route). */}
        <Route path="leads" element={<LeadWorkspacePage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        {/* EAP-3: the Enterprise Assessment Center — same Platform-
            Administrator-gated-server-side pattern as Leads above, not a
            route-level block. */}
        <Route path="assessments" element={<AssessmentWorkspacePage />} />
        <Route path="assessments/:id" element={<AssessmentDetailPage />} />
        {/* EAP-4: the Enterprise Organization Management Platform — same
            Platform-Administrator-gated-server-side pattern as Leads/
            Assessments above, not a route-level block. */}
        <Route path="organizations" element={<OrganizationWorkspacePage />} />
        <Route path="organizations/:id" element={<OrganizationDetailPage />} />
        {/* EAP-5: the Enterprise Identity & User Management module — same
            Platform-Administrator-gated-server-side pattern as every module
            above, not a route-level block. */}
        <Route path="users" element={<UserWorkspacePage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        {/* EAP-6: the Enterprise Audit Center — same Platform-
            Administrator-gated-server-side pattern as every module above,
            not a route-level block. No `/admin/audit/:id` route: an audit
            event has no standalone detail page (Audit Details is an inline
            panel within the Workspace itself — AuditEventDetailPanel), same
            reasoning `ARCHITECTURE.md`'s EAP-6 section records for GET
            /api/audit not gaining an `:id` sibling either. */}
        <Route path="audit" element={<AuditWorkspacePage />} />
        {/* EAP-7: the Enterprise Operations Center — same Platform-
            Administrator-gated-server-side pattern as every module above,
            not a route-level block. No `/admin/operations/:id` route: an
            operations summary has no per-record detail the way a lead/
            organization/user does. */}
        <Route path="operations" element={<OperationsWorkspacePage />} />
        {/* EAP-8: the Enterprise Reporting & Analytics module — same
            Platform-Administrator-gated-server-side pattern as every module
            above, not a route-level block. No `/admin/reporting/:id` route:
            the Executive Dashboard/Business Reports/Analytics are all
            summary views, none with a standalone per-record detail page. */}
        <Route path="reporting" element={<ReportingWorkspacePage />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
