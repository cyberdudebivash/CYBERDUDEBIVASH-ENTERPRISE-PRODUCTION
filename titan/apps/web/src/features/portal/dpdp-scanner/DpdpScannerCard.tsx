import { Link } from "react-router-dom";
import { Badge } from "@titan/design-system";
import { useDpdpScannerAccess } from "./useDpdpScannerAccess.js";
import "./DpdpScannerCard.css";

/**
 * The Customer Portal Dashboard's own premium-feature promotion — real,
 * server-checked access (`useDpdpScannerAccess`, `GET
 * /api/portal/dpdp-scanner/access`) decides the call to action, not a
 * client-side guess: an organization that has already paid sees "Run a new
 * scan", everyone else sees "Unlock" — both link to the same
 * `/portal/dpdp-scanner` route, which does the real, authoritative check
 * itself and renders the paywall or the scanner accordingly.
 */
export function DpdpScannerCard() {
  const { access } = useDpdpScannerAccess();
  const hasAccess = access.status === "ready" && access.data;

  return (
    <div className="titan-dpdp-scanner-card">
      <div className="titan-dpdp-scanner-card__badge">
        <Badge tone="warning">Premium feature</Badge>
      </div>
      <h2 className="titan-dpdp-scanner-card__title">DPDP Compliance Scanner</h2>
      <p className="titan-dpdp-scanner-card__description">
        Run a real DPDP Act 2023 compliance scan for your organization — an instant risk score, a
        full gap analysis, and a downloadable PDF report. Every scan is saved to your
        organization&rsquo;s own assessment history.
      </p>
      {!hasAccess && (
        <p className="titan-dpdp-scanner-card__meta">
          Unlock with any paid plan — Razorpay checkout, activated instantly.
        </p>
      )}
      <Link to="/portal/dpdp-scanner" className="titan-dpdp-scanner-card__cta">
        {hasAccess ? "Run a new scan →" : "Unlock the scanner →"}
      </Link>
    </div>
  );
}
