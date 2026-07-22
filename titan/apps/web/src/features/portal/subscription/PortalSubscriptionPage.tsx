import { useState } from "react";
import { Alert, Button, LoadingSkeleton, Panel } from "@titan/design-system";
import { PlanCard } from "../../admin/commercial/PlanCard.js";
import { SeatUsageMeter } from "../../admin/commercial/SeatUsageMeter.js";
import { SubscriptionStatusBadge } from "../../admin/commercial/SubscriptionStatusBadge.js";
import { EntitlementBadge } from "../../admin/commercial/EntitlementBadge.js";
import {
  createPortalSubscription,
  updatePortalSubscription,
} from "../../admin/commercial/commercialApi.js";
import { usePortalSubscription } from "./usePortalSubscription.js";
import "./PortalSubscriptionPage.css";

/**
 * Subscription — CPP-1's Customer Portal shell's own Commercial Dashboard
 * (Subscription Overview, Current Plan, License Summary, Usage Summary,
 * Entitlements, Renewal Information, Trial Status, COM-1 Workstream 1) and
 * Subscription lifecycle actions (Plan Selection/Upgrade/Downgrade/
 * Cancellation/Renewal, Workstream 2) combined on one page, the same
 * "dashboard content plus the actions that act on it" shape Organization
 * Details already established for Health+Administration. A new sibling
 * route under `/portal` (`App.tsx`), not a modification of the pre-existing
 * `PortalDashboardPage.tsx` — the Enterprise Customer Portal (CPP-1) is a
 * named do-not-redesign system for this phase.
 */
export function PortalSubscriptionPage() {
  const { summary, plans, reload } = usePortalSubscription();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function subscribe(planId: string) {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await createPortalSubscription(planId);
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start this plan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changePlan(planId: string) {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updatePortalSubscription({ planId });
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not change your plan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancel() {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updatePortalSubscription({ status: "canceled" });
      reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not cancel your subscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function renew() {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updatePortalSubscription({ status: "active" });
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not renew your subscription.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="titan-portal-subscription">
      <div className="titan-portal-subscription__header">
        <h1 className="titan-portal-subscription__title">Subscription</h1>
      </div>

      {actionError && (
        <Alert variant="error" title="Could not complete this action">
          {actionError}
        </Alert>
      )}

      {summary.status === "loading" && (
        <LoadingSkeleton lines={6} label="Loading your subscription…" />
      )}
      {summary.status === "forbidden" && (
        <p className="titan-portal-subscription__note">
          Subscription details are currently unavailable.
        </p>
      )}
      {summary.status === "error" && (
        <Alert variant="error" title="Could not load your subscription">
          {summary.message}
        </Alert>
      )}

      {summary.status === "ready" && summary.data.subscription === null && (
        <Panel title="Choose a plan">
          <p className="titan-portal-subscription__note">
            Your organization does not have an active subscription yet.
          </p>
          {plans.status === "ready" && (
            <div className="titan-portal-subscription__plans">
              {plans.data.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  disabled={isSubmitting}
                  onSelect={plan.trialDays > 0 ? () => void subscribe(plan.id) : undefined}
                  selectLabel={plan.trialDays > 0 ? `Start ${plan.name} trial` : undefined}
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      {summary.status === "ready" && summary.data.subscription && summary.data.plan && (
        <>
          <dl className="titan-portal-subscription__meta">
            <div>
              <dt>Status</dt>
              <dd>
                <SubscriptionStatusBadge status={summary.data.subscription.status} />
              </dd>
            </div>
            {summary.data.subscription.status === "trialing" &&
              summary.data.subscription.trialEndsAt && (
                <div>
                  <dt>Trial ends</dt>
                  <dd>{new Date(summary.data.subscription.trialEndsAt).toLocaleDateString()}</dd>
                </div>
              )}
            {summary.data.subscription.currentPeriodEnd && (
              <div>
                <dt>Renews / ends</dt>
                <dd>{new Date(summary.data.subscription.currentPeriodEnd).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>

          <Panel title="Current plan">
            <PlanCard plan={summary.data.plan} isCurrent />
          </Panel>

          <Panel title="License &amp; usage">
            {summary.data.license && (
              <SeatUsageMeter
                seatsUsed={summary.data.seatsUsed}
                seatLimit={summary.data.license.seatLimit}
              />
            )}
          </Panel>

          <Panel title="Entitlements">
            {summary.data.entitlements && (
              <ul className="titan-portal-subscription__entitlements">
                <li>
                  <EntitlementBadge
                    label="Compliance report export"
                    enabled={summary.data.entitlements.complianceReportExport}
                  />
                </li>
                <li>
                  <EntitlementBadge
                    label="Support requests"
                    enabled={summary.data.entitlements.supportRequests}
                  />
                </li>
                <li>
                  <EntitlementBadge
                    label="Priority support"
                    enabled={summary.data.entitlements.prioritySupport}
                  />
                </li>
              </ul>
            )}
          </Panel>

          <Panel title="Manage subscription">
            <div className="titan-portal-subscription__actions">
              {plans.status === "ready" &&
                plans.data
                  .filter((plan) => plan.id !== summary.data.plan?.id && plan.trialDays > 0)
                  .map((plan) => (
                    <Button
                      key={plan.id}
                      variant="secondary"
                      isLoading={isSubmitting}
                      onClick={() => void changePlan(plan.id)}
                    >
                      Switch to {plan.name}
                    </Button>
                  ))}
              {summary.data.subscription.status !== "canceled" && (
                <Button variant="danger" isLoading={isSubmitting} onClick={() => void cancel()}>
                  Cancel subscription
                </Button>
              )}
              {(summary.data.subscription.status === "canceled" ||
                summary.data.subscription.status === "expired") && (
                <Button isLoading={isSubmitting} onClick={() => void renew()}>
                  Renew subscription
                </Button>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
