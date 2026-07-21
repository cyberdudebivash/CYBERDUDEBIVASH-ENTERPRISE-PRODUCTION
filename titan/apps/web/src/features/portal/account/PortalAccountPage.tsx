import { Panel } from "@titan/design-system";
import { useSession } from "../../admin/auth/SessionContext.js";
import type { MeResponse } from "../../admin/auth/session.js";
import { signOutUrl } from "../../admin/auth/authUrls.js";
import "./PortalAccountPage.css";

/**
 * Account — deliberately smaller than a typical "account settings" page,
 * each omission real and named rather than silently dropped:
 *
 * - **Profile** is read-only (email, organization role) — the same
 *   `UserRecord`'s own doc comment reasoning `@titan/platform` already
 *   establishes: identity is created and owned only by a real Auth.js
 *   sign-in, so there is no self-service edit path here either.
 * - **Password** isn't built: this deployment has no credentials
 *   (username/password) auth provider at all (`DECISION_LOG.md`'s own
 *   "don't add a Credentials provider" decision) — there is no password to
 *   change.
 * - **Session Management** is real sign-out only (the same hosted Auth.js
 *   sign-out flow `Header`'s own link already uses) — listing or revoking
 *   *other* active sessions would need a new read path into Auth.js's own
 *   `sessions` table, which no repository in this codebase exposes today;
 *   a real, named future-work item (`DECISION_LOG.md`'s CPP-1 entry), not
 *   fabricated here.
 * - **Preferences/Notification Settings** aren't built: no
 *   settings-persistence service and no email-delivery system exists
 *   anywhere in this codebase (Auth.js's own Email provider logs its link
 *   instead of sending real mail, unchanged since Stage 4) to back a real
 *   control — building toggles with nothing real behind them would be
 *   exactly the kind of fabricated implementation this program's
 *   principles rule out.
 */
export function PortalAccountPage() {
  const session = useSession();
  if (session.status !== "authenticated") return null;
  return <PortalAccountContent me={session.me} />;
}

/** Exported for direct testing — a fixed `me` instead of driving routing/
 * session context per test, the same `*Content` pattern every sibling
 * admin page already follows. */
export function PortalAccountContent({ me }: { me: MeResponse }) {
  const organizationProfile = me.profiles.find((profile) => profile.organizationId !== null);

  return (
    <div className="titan-portal-account">
      <h1 className="titan-portal-account__title">Account</h1>

      <Panel title="Profile">
        <dl className="titan-portal-account__meta">
          <div>
            <dt>Email</dt>
            <dd>{me.email ?? "Not set"}</dd>
          </div>
          {organizationProfile && (
            <div>
              <dt>Role</dt>
              <dd>{organizationProfile.role}</dd>
            </div>
          )}
        </dl>
      </Panel>

      <Panel title="Session">
        <p className="titan-portal-account__note">
          You are signed in as {me.email ?? "your account"}.
        </p>
        <a href={signOutUrl("/")} className="titan-portal-account__sign-out">
          Sign out
        </a>
      </Panel>
    </div>
  );
}
