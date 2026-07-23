import { useState, type FormEvent } from "react";
import { Alert, Button, Panel } from "@titan/design-system";
import { createPortalOrganization } from "../portalApi.js";
import "./PortalOnboarding.css";

/**
 * The real fix for a documented production incident (this repository's own
 * DECISION_LOG.md, 2026-07-23 audit entry): a customer completing a fully
 * correct sign-in still had no organization and no self-service path to
 * one — every membership required a Platform Administrator to grant it
 * first. `PortalLayout` renders this instead of its old dead-end "contact
 * your administrator" message whenever a real, authenticated session has
 * zero organization memberships.
 *
 * A full page reload after success (not a client-side route change) is
 * deliberate, not an oversight: `SessionContext`'s `useSession()` resolves
 * "who is signed in" once per mount with no exposed refetch, and
 * `RequireAuth.tsx` already uses a real full-page navigation for the
 * equivalent "significant auth-state transition" case (the unauthenticated
 * redirect to sign-in) — this follows that same established pattern rather
 * than inventing a second one just for this form.
 */
export function PortalOnboarding() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createPortalOrganization({
        name,
        industry: industry.trim() === "" ? null : industry,
      });
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not create your organization.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="titan-portal-onboarding">
      <Panel title="Create your organization">
        <p className="titan-portal-onboarding__lead">
          Your account isn&apos;t linked to an organization yet. Create one now to unlock the DPDP
          Scanner, compliance reports, and the rest of the Customer Portal — this only takes a
          moment, and you&apos;ll be the owner.
        </p>
        <form className="titan-portal-onboarding__form" onSubmit={handleSubmit}>
          <label className="titan-portal-onboarding__field">
            Organization name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Fintech"
              required
              maxLength={200}
            />
          </label>
          <label className="titan-portal-onboarding__field">
            Industry <span className="titan-portal-onboarding__optional">(optional)</span>
            <input
              type="text"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              placeholder="Financial Services"
            />
          </label>
          {error && (
            <Alert variant="error" title="Could not create your organization">
              {error}
            </Alert>
          )}
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create organization
          </Button>
        </form>
      </Panel>
    </div>
  );
}
