import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  DataTable,
  EmptyState,
  FilterPanel,
  LoadingSkeleton,
  Pagination,
  SearchBar,
  type DataTableColumn,
} from "@titan/design-system";
import type { SupportRequestRecord, SupportRequestStatus } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { SupportRequestStatusBadge } from "./SupportRequestStatusBadge.js";
import { updateSupportRequestStatus } from "./supportRequestApi.js";
import { useSupportRequestSearch } from "./useSupportRequestSearch.js";
import "./SupportRequestWorkspacePage.css";

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

/**
 * Admin Support Queue (2026-07-23 production-readiness audit,
 * DECISION_LOG.md's Workstream 15) — the real cross-organization
 * counterpart to the customer-scoped Support page: every request a
 * customer submits via `/portal/support` lands here, where a Platform
 * Administrator can search/filter it and mark it resolved or reopen it.
 * Closes a real, live gap `SupportRequestRepository`'s own git history
 * documents: before this, no administrator could ever see or close a
 * customer's request. Deliberately one page, no separate detail route —
 * the only real admin action here is a status toggle, the same reasoning
 * `AuditWorkspacePage`'s own "no /admin/audit/:id" choice documents for a
 * different entity with no per-record detail worth a whole page.
 */
export function SupportRequestWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <SupportRequestWorkspaceContent /> : null;
}

/** Exported for direct testing, matching every sibling workspace page's own
 * pattern (LeadWorkspaceContent, OrganizationWorkspaceContent). */
export function SupportRequestWorkspaceContent() {
  const search = useSupportRequestSearch();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleToggleStatus(request: SupportRequestRecord) {
    const nextStatus: SupportRequestStatus = request.status === "open" ? "resolved" : "open";
    setUpdatingId(request.id);
    setActionError(null);
    try {
      await updateSupportRequestStatus(request.id, nextStatus);
      search.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update this support request.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: DataTableColumn<SupportRequestRecord>[] = [
    {
      id: "createdAt",
      header: "Received",
      render: (request) => new Date(request.createdAt).toLocaleString(),
    },
    { id: "subject", header: "Subject", render: (request) => request.subject },
    {
      id: "message",
      header: "Message",
      render: (request) => <span title={request.message}>{truncate(request.message, 80)}</span>,
    },
    {
      id: "organizationId",
      header: "Organization",
      render: (request) =>
        request.organizationId ? (
          <Link to={`/admin/organizations/${request.organizationId}`}>
            {request.organizationId}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      id: "status",
      header: "Status",
      render: (request) => <SupportRequestStatusBadge status={request.status} />,
    },
    {
      id: "action",
      header: "",
      render: (request) => (
        <Button
          variant="secondary"
          size="sm"
          isLoading={updatingId === request.id}
          onClick={() => handleToggleStatus(request)}
        >
          {request.status === "open" ? "Mark resolved" : "Reopen"}
        </Button>
      ),
    },
  ];

  return (
    <div className="titan-support-workspace">
      <h1 className="titan-support-workspace__title">Support Requests</h1>

      <div className="titan-support-workspace__controls">
        <SearchBar
          label="Search support requests"
          placeholder="Subject or message…"
          value={search.filters.search}
          onChange={(value) => search.setFilter("search", value)}
        />
        <FilterPanel
          fields={[
            {
              id: "status",
              label: "Status",
              value: search.filters.status,
              options: [
                { value: "open", label: "Open" },
                { value: "resolved", label: "Resolved" },
              ],
            },
          ]}
          onChange={(fieldId, value) => search.setFilter(fieldId as "status", value)}
        />
      </div>

      {actionError && (
        <Alert variant="error" title="Could not update this support request">
          {actionError}
        </Alert>
      )}

      <SupportRequestTableSection
        state={search.result}
        columns={columns}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function SupportRequestTableSection({
  state,
  columns,
  onPageChange,
}: {
  state: ReturnType<typeof useSupportRequestSearch>["result"];
  columns: DataTableColumn<SupportRequestRecord>[];
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading support requests…" />;
    case "forbidden":
      return (
        <p className="titan-support-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load support requests">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No support requests match these filters"
            description="Try clearing a filter or searching for something else."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.requests}
            getRowKey={(request) => request.id}
            caption="Support Requests"
          />
          <Pagination
            page={state.data.page}
            pageSize={state.data.pageSize}
            total={state.data.total}
            onPageChange={onPageChange}
          />
        </>
      );
  }
}
