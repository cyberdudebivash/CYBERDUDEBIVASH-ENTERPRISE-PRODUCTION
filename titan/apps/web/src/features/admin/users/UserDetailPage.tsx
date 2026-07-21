import { Link, useParams } from "react-router-dom";
import { Alert, LoadingSkeleton, Panel } from "@titan/design-system";
import { useSession } from "../auth/SessionContext.js";
import { RoleAssignmentPanel } from "./RoleAssignmentPanel.js";
import { UserAuditPanel } from "./UserAuditPanel.js";
import { UserRelationshipsPanel } from "./UserRelationshipsPanel.js";
import { useUserDetail } from "./useUserDetail.js";
import type { UserWithProfiles } from "./userApi.js";
import "./UserDetailPage.css";

export function UserDetailPage() {
  const session = useSession();
  const { id } = useParams<{ id: string }>();
  if (session.status !== "authenticated" || !id) return null;
  return <UserDetailContent id={id} />;
}

/** Exported for direct testing, matching every other Detail page's pattern
 * (EAP-2/3/4) — a fixed `id` instead of driving routing/session context per
 * test. */
export function UserDetailContent({ id }: { id: string }) {
  const detail = useUserDetail(id);

  return (
    <div className="titan-user-detail">
      <Link to="/admin/users" className="titan-user-detail__back">
        ← Back to Users
      </Link>

      {detail.user.status === "loading" && <LoadingSkeleton lines={6} label="Loading user…" />}

      {detail.user.status === "forbidden" && (
        <p className="titan-user-detail__note">
          Platform Administrator role required to view this.
        </p>
      )}

      {detail.user.status === "error" && (
        <Alert variant="error" title="Could not load this user">
          {detail.user.message}
        </Alert>
      )}

      {detail.user.status === "ready" && <UserDetailBody user={detail.user.data} detail={detail} />}
    </div>
  );
}

function UserDetailBody({
  user,
  detail,
}: {
  user: UserWithProfiles;
  detail: ReturnType<typeof useUserDetail>;
}) {
  return (
    <>
      <div className="titan-user-detail__heading">
        <h1 className="titan-user-detail__title">{user.name ?? "(no name on file)"}</h1>
      </div>

      <div className="titan-user-detail__grid">
        <Panel title="Identity">
          <dl className="titan-user-detail__fields">
            <div>
              <dt>Email</dt>
              <dd>{user.email ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Email verified</dt>
              <dd>
                {user.emailVerified
                  ? new Date(user.emailVerified).toLocaleString()
                  : "Not verified"}
              </dd>
            </div>
            <div>
              <dt>User id</dt>
              <dd>{user.id}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Role Assignment">
          <RoleAssignmentPanel
            profiles={user.profiles}
            organizations={detail.organizations}
            isSubmitting={detail.isSubmitting}
            submitError={detail.submitError}
            onGrant={detail.grant}
            onChangeRole={detail.changeRole}
            onRevoke={detail.revoke}
          />
        </Panel>

        <Panel title="Relationships">
          <UserRelationshipsPanel
            assignedLeads={detail.assignedLeads}
            createdAssessments={detail.createdAssessments}
          />
        </Panel>

        <Panel title="Activity & audit history">
          {detail.auditTrail.status === "loading" && (
            <LoadingSkeleton lines={4} label="Loading activity…" />
          )}
          {detail.auditTrail.status === "forbidden" && (
            <p className="titan-user-detail__note">
              Platform Administrator role required to view this.
            </p>
          )}
          {detail.auditTrail.status === "error" && (
            <Alert variant="error" title="Could not load activity">
              {detail.auditTrail.message}
            </Alert>
          )}
          {detail.auditTrail.status === "ready" && (
            <UserAuditPanel events={detail.auditTrail.data} />
          )}
        </Panel>
      </div>
    </>
  );
}
