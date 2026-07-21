import { Badge } from "@titan/design-system";
import { Link } from "react-router-dom";
import { auditEntityDetailPath, auditEntityTypeLabel } from "./auditActionLabels.js";
import "./AuditEntityBadge.css";

export interface AuditEntityBadgeProps {
  entityType: string;
  entityId: string | null;
}

/**
 * EAP-6: a `Badge` (the shared low-level primitive every domain badge in
 * this codebase already wraps — `OrganizationStatusBadge`, `RoleBadge`) over
 * one audit event's `(entityType, entityId)` pair, rendered as a real link
 * into that entity's own detail page whenever one exists
 * (`auditEntityDetailPath`) — the same cross-module navigation every other
 * detail page's own audit panel already gives you one entity at a time, now
 * available from the Audit Center's own cross-entity table. Three real
 * consumers (Workspace table, Investigation grouping, event detail), which
 * is what makes this its own component rather than inline JSX repeated at
 * each call site.
 */
export function AuditEntityBadge({ entityType, entityId }: AuditEntityBadgeProps) {
  const label = auditEntityTypeLabel(entityType);
  const path = entityId ? auditEntityDetailPath(entityType, entityId) : null;

  if (path) {
    return (
      <Link to={path} className="titan-audit-entity-badge__link">
        <Badge tone="info">{label}</Badge>
      </Link>
    );
  }

  return <Badge tone="neutral">{label}</Badge>;
}
