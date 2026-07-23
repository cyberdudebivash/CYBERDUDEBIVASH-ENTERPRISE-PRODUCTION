import type { Plan } from "@titan/platform";
import { Badge, Button } from "@titan/design-system";
import { EntitlementBadge } from "./EntitlementBadge.js";
import "./PlanCard.css";

export interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  /** Omitted entirely renders no action — the admin Commercial Detail page
   * (COM-1) shows a plan's own card read-only, with no selection action of
   * its own; the Customer Portal's plan-selection view supplies one. */
  onSelect?: () => void;
  selectLabel?: string;
  disabled?: boolean;
  /** Real, multi-currency checkout: when the caller has already resolved a
   * real chargeable amount for a specific currency (`findPlanPricing`),
   * this replaces `plan.priceDisplay`'s static text with the actual price
   * the customer is about to be charged in their chosen currency. Omitted
   * entirely (the admin Commercial Detail page, which has no currency
   * selection of its own) falls back to `priceDisplay` unchanged. */
  priceOverride?: string;
}

/** COM-1: one plan from the real, code-defined catalog (`PLAN_CATALOG`) —
 * real consumers on both the Customer Portal's own plan-selection/upgrade
 * view (rendered once per plan, with a real `onSelect` action) and the
 * admin Commercial Detail page (rendered once, for the organization's
 * current plan, with no action). `priceDisplay` is exactly that — display
 * text, never a real chargeable amount (`commercial/planCatalog.ts`'s own
 * doc comment). */
export function PlanCard({
  plan,
  isCurrent,
  onSelect,
  selectLabel,
  disabled,
  priceOverride,
}: PlanCardProps) {
  return (
    <div
      className={`titan-plan-card${isCurrent ? " titan-plan-card--current" : ""}`}
      aria-label={`${plan.name} plan`}
    >
      <div className="titan-plan-card__header">
        <h3 className="titan-plan-card__name">{plan.name}</h3>
        {isCurrent && <Badge tone="info">Current plan</Badge>}
      </div>
      <p className="titan-plan-card__price">{priceOverride ?? plan.priceDisplay}</p>
      <ul className="titan-plan-card__entitlements">
        <li>
          <EntitlementBadge label={`${plan.entitlements.maxSeats} seats`} enabled />
        </li>
        <li>
          <EntitlementBadge
            label="Compliance report export"
            enabled={plan.entitlements.complianceReportExport}
          />
        </li>
        <li>
          <EntitlementBadge label="Support requests" enabled={plan.entitlements.supportRequests} />
        </li>
        <li>
          <EntitlementBadge label="Priority support" enabled={plan.entitlements.prioritySupport} />
        </li>
      </ul>
      {onSelect && (
        <Button
          variant={isCurrent ? "secondary" : "primary"}
          onClick={onSelect}
          disabled={disabled}
        >
          {selectLabel ?? `Choose ${plan.name}`}
        </Button>
      )}
    </div>
  );
}
