import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, LoadingSkeleton, Timeline, type TimelineEntry } from "@titan/design-system";
import type { AuditEventRecord } from "@titan/platform";
import { getJson } from "../../../lib/apiClient.js";
import {
  auditActionLabel,
  auditEntityDetailPath,
  auditEntityTypeLabel,
} from "./auditActionLabels.js";
import { AuditEntityBadge } from "./AuditEntityBadge.js";
import "./AuditEventDetailPanel.css";

export interface AuditEventDetailPanelProps {
  event: AuditEventRecord;
  onClose: () => void;
}

/**
 * EAP-6: Audit Details (Workstream 3) — every field the brief asks for that
 * this data model actually has (actor, action, timestamp, entity, entity
 * type, organization, metadata, navigation links, related events) plus an
 * honest, explicit note for the one it doesn't (request context —
 * `audit_events` has no request-id/IP/user-agent column, so this says so
 * rather than fabricating one). "Related events" reuses the exact same
 * `GET /api/audit?entityType=...&entityId=...` endpoint every per-entity
 * audit panel already calls for "this record's own trail" — not a new
 * endpoint for a case that one already covers.
 */
export function AuditEventDetailPanel({ event, onClose }: AuditEventDetailPanelProps) {
  return (
    <div className="titan-audit-detail-panel" role="region" aria-label="Audit event details">
      <div className="titan-audit-detail-panel__header">
        <h2 className="titan-audit-detail-panel__title">{auditActionLabel(event.action)}</h2>
        <button type="button" className="titan-audit-detail-panel__close" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="titan-audit-detail-panel__fields">
        <div>
          <dt>Timestamp</dt>
          <dd>{new Date(event.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Actor</dt>
          <dd>
            {event.actorId ? (
              <Link to={`/admin/users/${encodeURIComponent(event.actorId)}`}>{event.actorId}</Link>
            ) : (
              "System / anonymous"
            )}
          </dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd>
            {event.organizationId ? (
              <Link to={`/admin/organizations/${encodeURIComponent(event.organizationId)}`}>
                {event.organizationId}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Entity</dt>
          <dd>
            <AuditEntityBadge entityType={event.entityType} entityId={event.entityId} />{" "}
            {event.entityId ?? "—"}
          </dd>
        </div>
        <div>
          <dt>Request context</dt>
          <dd>Not captured — this event log has no request id, IP, or user-agent column.</dd>
        </div>
      </dl>

      <h3 className="titan-audit-detail-panel__subheading">Raw metadata</h3>
      {event.metadata ? (
        <pre className="titan-audit-detail-panel__metadata">
          {JSON.stringify(event.metadata, null, 2)}
        </pre>
      ) : (
        <p className="titan-audit-detail-panel__note">No metadata recorded for this event.</p>
      )}

      <h3 className="titan-audit-detail-panel__subheading">
        Related events ({auditEntityTypeLabel(event.entityType)})
      </h3>
      <RelatedEvents event={event} />
    </div>
  );
}

function RelatedEvents({ event }: { event: AuditEventRecord }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; events: AuditEventRecord[] } | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    if (!event.entityId) {
      setState({ status: "ready", events: [] });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    const params = new URLSearchParams({ entityType: event.entityType, entityId: event.entityId });
    getJson<AuditEventRecord[]>(`/api/audit?${params}`)
      .then((events) => {
        if (!cancelled) setState({ status: "ready", events });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [event.entityType, event.entityId]);

  if (state.status === "loading")
    return <LoadingSkeleton lines={3} label="Loading related events…" />;
  if (state.status === "error") {
    return (
      <Alert variant="error" title="Could not load related events">
        Try again later.
      </Alert>
    );
  }

  const entries: TimelineEntry[] = state.events.map((related) => ({
    id: related.id,
    label: auditActionLabel(related.action),
    detail: related.id === event.id ? "This event" : undefined,
    timestamp: new Date(related.createdAt).toLocaleString(),
  }));

  const detailPath = event.entityId
    ? auditEntityDetailPath(event.entityType, event.entityId)
    : null;

  return (
    <>
      <Timeline entries={entries} emptyLabel="No other events recorded for this entity." />
      {detailPath && (
        <Link to={detailPath} className="titan-audit-detail-panel__entity-link">
          Open this {auditEntityTypeLabel(event.entityType).toLowerCase()}&rsquo;s own detail page →
        </Link>
      )}
    </>
  );
}
