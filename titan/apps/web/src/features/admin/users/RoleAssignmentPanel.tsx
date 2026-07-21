import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button } from "@titan/design-system";
import { USER_ROLES } from "@titan/platform";
import type { OrganizationRecord, UserProfileRecord, UserRole } from "@titan/platform";
import { RoleBadge } from "./RoleBadge.js";
import "./RoleAssignmentPanel.css";

export interface RoleAssignmentPanelProps {
  profiles: UserProfileRecord[];
  organizations: OrganizationRecord[];
  isSubmitting: boolean;
  submitError: string | null;
  onGrant: (organizationId: string | null, role: UserRole) => Promise<void>;
  onChangeRole: (profileId: string, role: UserRole) => Promise<void>;
  onRevoke: (profileId: string) => Promise<void>;
}

const ROLE_LABELS: Record<UserRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/**
 * The real write surface of Role Assignment and Administrative User
 * Lifecycle (EAP-5): grant a new organization (or platform-wide) role,
 * change an existing one, or revoke it — every control a direct call
 * through `useUserDetail` (`grant`/`changeRole`/`revoke`), re-rendering
 * from the server's own re-read, same "never optimistic-only" discipline
 * as `OrganizationAdministrationPanel`/`LeadLifecyclePanel`. The server
 * enforces the last-Platform-Administrator lockout guard
 * (`wouldRemoveLastPlatformAdministrator`, router.ts); this panel surfaces
 * whatever 409 that produces via `submitError` rather than re-implementing
 * the same check client-side, where it could drift from the real policy.
 */
export function RoleAssignmentPanel({
  profiles,
  organizations,
  isSubmitting,
  submitError,
  onGrant,
  onChangeRole,
  onRevoke,
}: RoleAssignmentPanelProps) {
  const [grantOrganizationId, setGrantOrganizationId] = useState("");
  const [grantRole, setGrantRole] = useState<UserRole>("member");

  function organizationName(organizationId: string | null): string {
    if (organizationId === null) return "Platform-wide";
    return organizations.find((org) => org.id === organizationId)?.name ?? organizationId;
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault();
    await onGrant(grantOrganizationId === "" ? null : grantOrganizationId, grantRole);
    setGrantOrganizationId("");
    setGrantRole("member");
  }

  return (
    <div className="titan-role-assignment">
      {submitError && (
        <Alert variant="error" title="Could not save this change">
          {submitError}
        </Alert>
      )}

      {profiles.length === 0 ? (
        <p className="titan-role-assignment__note">
          This user has no organization or platform roles yet.
        </p>
      ) : (
        <ul className="titan-role-assignment__list">
          {profiles.map((profile) => {
            const isPlatformAdministrator =
              profile.organizationId === null && profile.role === "owner";
            return (
              <li key={profile.id} className="titan-role-assignment__item">
                <div className="titan-role-assignment__item-info">
                  <span className="titan-role-assignment__org-name">
                    {organizationName(profile.organizationId)}
                  </span>
                  <RoleBadge
                    userRole={profile.role}
                    isPlatformAdministrator={isPlatformAdministrator}
                  />
                </div>
                <div className="titan-role-assignment__item-actions">
                  <select
                    className="titan-role-assignment__role-select"
                    aria-label={`Change role for ${organizationName(profile.organizationId)}`}
                    value={profile.role}
                    disabled={isSubmitting}
                    onChange={(event) => onChangeRole(profile.id, event.target.value as UserRole)}
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => onRevoke(profile.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="titan-role-assignment__grant-form" onSubmit={handleGrant}>
        <label>
          <span>Organization</span>
          <select
            value={grantOrganizationId}
            disabled={isSubmitting}
            onChange={(event) => setGrantOrganizationId(event.target.value)}
          >
            <option value="">Platform-wide (no organization)</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Role</span>
          <select
            value={grantRole}
            disabled={isSubmitting}
            onChange={(event) => setGrantRole(event.target.value as UserRole)}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" isLoading={isSubmitting}>
          Grant role
        </Button>
      </form>
    </div>
  );
}
