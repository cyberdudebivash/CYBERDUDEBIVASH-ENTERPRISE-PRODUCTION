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
