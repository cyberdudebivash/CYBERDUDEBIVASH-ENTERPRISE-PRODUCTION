import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Button, LoadingSkeleton, Panel } from "@titan/design-system";
import { PLAN_CATALOG, type SubscriptionStatus } from "@titan/platform";
import { PlanCard } from "./PlanCard.js";
import { SeatUsageMeter } from "./SeatUsageMeter.js";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge.js";
import { updateCommercialSubscription } from "./commercialApi.js";
import { useCommercialSubscriptionDetail } from "./useCommercialSubscriptionDetail.js";
import "./CommercialSubscriptionDetailPage.css";

export function CommercialSubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CommercialSubscriptionDetailContent id={id} />;
}

/** COM-1: Subscription Administration's detail view — exported for direct
 * testing, the same `*Content` pattern every sibling Detail page follows.
 * Unlike the Customer Portal's own subscription page, an admin override
 * accepts *any* known plan (including the sales-assisted "enterprise" one)
 * and any real status — `router.ts`'s `validateAdminSubscriptionPatch` is
 * deliberately broader than `validatePortalSubscriptionPatch`. */
export function CommercialSubscriptionDetailContent({ id }: { id: string }) {
  const { state, reload } = useCommercialSubscriptionDetail(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function applyPatch(patch: { planId?: string; status?: SubscriptionStatus }) {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updateCommercialSubscription(id, patch);
      reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update this subscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="titan-commercial-detail">
      <Link to="/admin/commercial" className="titan-commercial-detail__back">
        ← Back to Commercial
      </Link>

      {state.status === "loading" && <LoadingSkeleton lines={8} label="Loading subscription…" />}

      {state.status === "forbidden" && <p>Platform Administrator role required to view this.</p>}

      {state.status === "error" && (
        <Alert variant="error" title="Could not load this subscription">
          {state.message}
        </Alert>
      )}

      {state.status === "ready" && (
        <>
          <dl className="titan-commercial-detail__meta">
            <div>
              <dt>Organization</dt>
              <dd>{state.data.subscription.organizationId}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <SubscriptionStatusBadge status={state.data.subscription.status} />
              </dd>
            </div>
            <div>
              <dt>Renews / ends</dt>
              <dd>
                {state.data.subscription.currentPeriodEnd
                  ? new Date(state.data.subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>

          {actionError && (
            <Alert variant="error" title="Could not apply this change">
              {actionError}
            </Alert>
          )}

          <Panel title="Plan">
            {state.data.plan && <PlanCard plan={state.data.plan} isCurrent />}
          </Panel>

          <Panel title="License">
            {state.data.license ? (
              <SeatUsageMeter
                seatsUsed={state.data.seatsUsed}
                seatLimit={state.data.license.seatLimit}
              />
            ) : (
              <p>No license on record for this subscription.</p>
            )}
          </Panel>

          <Panel title="Administration">
            <div className="titan-commercial-detail__actions">
              <label>
                Assign plan{" "}
                <select
                  disabled={isSubmitting}
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) void applyPatch({ planId: event.target.value });
                    event.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    Choose a plan…
                  </option>
                  {PLAN_CATALOG.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              {state.data.subscription.status !== "canceled" && (
                <Button
                  variant="danger"
                  isLoading={isSubmitting}
                  onClick={() => void applyPatch({ status: "canceled" })}
                >
                  Cancel subscription
                </Button>
              )}
              {(state.data.subscription.status === "canceled" ||
                state.data.subscription.status === "expired") && (
                <Button
                  isLoading={isSubmitting}
                  onClick={() => void applyPatch({ status: "active" })}
                >
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
