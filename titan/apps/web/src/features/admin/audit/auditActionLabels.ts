/**
 * EAP-6: the canonical action/entity-type vocabulary this system's
 * `audit_events` table actually contains — every `action:`/`entityType:`
 * literal any `recordAuditEvent` call site in `router.ts` uses, nothing
 * invented beyond that. Previously duplicated once per per-entity audit
 * panel (Lead/Assessment/Organization/User); the Audit Center is a genuine
 * fifth consumer that needs the same map for its own action column and
 * filter, which is what makes consolidating it here (rather than a sixth
 * private copy) a real reuse, not a speculative abstraction. The four
 * existing panels now import from here instead of keeping their own.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.viewed": "Lead viewed",
  "lead.status_changed": "Status changed",
  "lead.priority_changed": "Priority changed",
  "lead.assigned": "Assignment changed",
  "lead.tags_changed": "Tags changed",
  "lead.note_added": "Note added",
  "assessment.created": "Assessment created",
  "assessment.viewed": "Assessment viewed",
  "organization.created": "Organization created",
  "organization.viewed": "Organization viewed",
  "organization.updated": "Organization details updated",
  "organization.archived": "Organization archived",
  "organization.restored": "Organization restored",
  "organization.note_added": "Note added",
  "user.viewed": "User viewed",
  "user.role_granted": "Role granted",
  "user.role_changed": "Role changed",
  "user.role_revoked": "Role revoked",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/** The closed set of `entityType` values every audit event actually carries
 * — one per business module that records audit events today. */
export const AUDIT_ENTITY_TYPES = ["lead", "assessment", "organization", "user"] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  lead: "Lead",
  assessment: "Assessment",
  organization: "Organization",
  user: "User",
};

export function auditEntityTypeLabel(entityType: string): string {
  return AUDIT_ENTITY_TYPE_LABELS[entityType as AuditEntityType] ?? entityType;
}

/** Where an entity type's own detail page lives — `null` means this entity
 * type has no admin detail route to link to (there is none today; every
 * current entity type does). Centralized so `AuditEntityBadge` and the
 * Workspace/Investigation views resolve a link the same way. */
export function auditEntityDetailPath(entityType: string, entityId: string): string | null {
  if (!(AUDIT_ENTITY_TYPES as readonly string[]).includes(entityType)) return null;
  return `/admin/${entityType}s/${encodeURIComponent(entityId)}`;
}
