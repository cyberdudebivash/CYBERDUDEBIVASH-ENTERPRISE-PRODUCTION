import { useState } from "react";
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
import type { AuditEventRecord, AuditSearchResult } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_TYPES, auditActionLabel } from "./auditActionLabels.js";
import { AuditEntityBadge } from "./AuditEntityBadge.js";
import { AuditEventDetailPanel } from "./AuditEventDetailPanel.js";
import { AuditInvestigationView } from "./AuditInvestigationView.js";
import { exportAuditEvents, type AuditExportFormat } from "./auditApi.js";
import { useAuditSearch } from "./useAuditSearch.js";
import {
  OPTIONAL_COLUMNS,
  deleteSavedFilter,
  getVisibleOptionalColumns,
  listSavedFilters,
  saveFilter,
  setVisibleOptionalColumns,
  type AuditFilterValues,
  type OptionalColumnId,
} from "./auditWorkspacePreferences.js";
import "./AuditWorkspacePage.css";

export function AuditWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <AuditWorkspaceContent /> : null;
}

const OPTIONAL_COLUMN_LABELS: Record<OptionalColumnId, string> = {
  actor: "Actor",
  organization: "Organization",
  metadata: "Metadata",
};

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const ENTITY_TYPE_OPTIONS = AUDIT_ENTITY_TYPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

/** Exported for direct testing, matching every other Workspace's own
 * `*Content` pattern (Organization/User/Assessment/Lead). */
export function AuditWorkspaceContent() {
  const search = useAuditSearch();
  const [visibleColumns, setVisibleColumnsState] = useState(getVisibleOptionalColumns);
  const [savedFilters, setSavedFilters] = useState(listSavedFilters);
  const [view, setView] = useState<"table" | "investigation">("table");
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRecord | null>(null);
  const [exportState, setExportState] = useState<
    { status: "idle" } | { status: "exporting" } | { status: "error"; message: string }
  >({ status: "idle" });

  function toggleColumn(id: OptionalColumnId) {
    const next = visibleColumns.includes(id)
      ? visibleColumns.filter((column) => column !== id)
      : [...visibleColumns, id];
    setVisibleColumnsState(next);
    setVisibleOptionalColumns(next);
  }

  function handleSaveFilter() {
    const name = window.prompt("Name this filter:");
    if (!name) return;
    saveFilter({ name, filters: search.filters, sortDirection: search.sortDirection });
    setSavedFilters(listSavedFilters());
  }

  function handleApplySavedFilter(name: string) {
    const saved = savedFilters.find((filter) => filter.name === name);
    if (!saved) return;
    search.applyFilters(saved.filters, saved.sortDirection);
  }

  function handleDeleteSavedFilter(name: string) {
    deleteSavedFilter(name);
    setSavedFilters(listSavedFilters());
  }

  async function handleExport(format: AuditExportFormat) {
    setExportState({ status: "exporting" });
    try {
      const { blob, filename } = await exportAuditEvents(
        currentFilterOptions(search.filters),
        format,
      );
      downloadBlob(blob, filename);
      setExportState({ status: "idle" });
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not export audit events.",
      });
    }
  }

  const columns: DataTableColumn<AuditEventRecord>[] = [
    {
      id: "createdAt",
      header: "Timestamp",
      sortable: true,
      render: (event) => (
        <button
          type="button"
          className="titan-audit-workspace__row-button"
          onClick={() => setSelectedEvent(event)}
        >
          {new Date(event.createdAt).toLocaleString()}
        </button>
      ),
    },
    {
      id: "action",
      header: "Action",
      render: (event) => auditActionLabel(event.action),
    },
    {
      id: "entity",
      header: "Entity",
      render: (event) => (
        <AuditEntityBadge entityType={event.entityType} entityId={event.entityId} />
      ),
    },
    ...(visibleColumns.includes("actor")
      ? [
          {
            id: "actor",
            header: "Actor",
            render: (event: AuditEventRecord) => event.actorId ?? "System / anonymous",
          },
        ]
      : []),
    ...(visibleColumns.includes("organization")
      ? [
          {
            id: "organization",
            header: "Organization",
            render: (event: AuditEventRecord) => event.organizationId ?? "—",
          },
        ]
      : []),
    ...(visibleColumns.includes("metadata")
      ? [
          {
            id: "metadata",
            header: "Metadata",
            render: (event: AuditEventRecord) =>
              event.metadata ? JSON.stringify(event.metadata) : "—",
          },
        ]
      : []),
  ];

  return (
    <div className="titan-audit-workspace">
      <div className="titan-audit-workspace__header">
        <h1 className="titan-audit-workspace__title">Audit Center</h1>
        <div className="titan-audit-workspace__export">
          <Button
            size="sm"
            variant="secondary"
            isLoading={exportState.status === "exporting"}
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isLoading={exportState.status === "exporting"}
            onClick={() => handleExport("json")}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {exportState.status === "error" && (
        <Alert variant="error" title="Export failed">
          {exportState.message}
        </Alert>
      )}

      <div className="titan-audit-workspace__controls">
        <SearchBar
          label="Search audit events"
          placeholder="Action, entity type, or entity id…"
          value={search.filters.search}
          onChange={(value) => search.setFilter("search", value)}
        />
        <FilterPanel
          fields={[
            {
              id: "entityType",
              label: "Entity type",
              value: search.filters.entityType,
              options: ENTITY_TYPE_OPTIONS,
            },
            {
              id: "action",
              label: "Action",
              value: search.filters.action,
              options: ACTION_OPTIONS,
            },
          ]}
          onChange={(fieldId, value) => search.setFilter(fieldId as keyof AuditFilterValues, value)}
        />
        <label className="titan-audit-workspace__text-filter">
          <span>Actor id</span>
          <input
            type="text"
            value={search.filters.actorId}
            onChange={(event) => search.setFilter("actorId", event.target.value)}
          />
        </label>
        <label className="titan-audit-workspace__text-filter">
          <span>Organization id</span>
          <input
            type="text"
            value={search.filters.organizationId}
            onChange={(event) => search.setFilter("organizationId", event.target.value)}
          />
        </label>
        <label className="titan-audit-workspace__date-filter">
          <span>From</span>
          <input
            type="date"
            value={search.filters.dateFrom.slice(0, 10)}
            onChange={(event) =>
              search.setFilter(
                "dateFrom",
                event.target.value ? `${event.target.value}T00:00:00.000Z` : "",
              )
            }
          />
        </label>
        <label className="titan-audit-workspace__date-filter">
          <span>To</span>
          <input
            type="date"
            value={search.filters.dateTo.slice(0, 10)}
            onChange={(event) =>
              search.setFilter(
                "dateTo",
                event.target.value ? `${event.target.value}T23:59:59.999Z` : "",
              )
            }
          />
        </label>
        <button
          type="button"
          className="titan-audit-workspace__save-filter"
          onClick={handleSaveFilter}
        >
          Save current filter
        </button>
      </div>

      {savedFilters.length > 0 && (
        <div className="titan-audit-workspace__saved-filters" aria-label="Saved filters">
          {savedFilters.map((filter) => (
            <span key={filter.name} className="titan-audit-workspace__saved-filter">
              <button type="button" onClick={() => handleApplySavedFilter(filter.name)}>
                {filter.name}
              </button>
              <button
                type="button"
                aria-label={`Delete saved filter ${filter.name}`}
                onClick={() => handleDeleteSavedFilter(filter.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <details className="titan-audit-workspace__columns">
        <summary>Columns</summary>
        <div className="titan-audit-workspace__columns-list">
          {OPTIONAL_COLUMNS.map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={visibleColumns.includes(id)}
                onChange={() => toggleColumn(id)}
              />
              {OPTIONAL_COLUMN_LABELS[id]}
            </label>
          ))}
        </div>
      </details>

      <div className="titan-audit-workspace__view-toggle" role="group" aria-label="View">
        <button
          type="button"
          aria-pressed={view === "table"}
          className={`titan-audit-workspace__view-button${
            view === "table" ? " titan-audit-workspace__view-button--active" : ""
          }`}
          onClick={() => setView("table")}
        >
          Table
        </button>
        <button
          type="button"
          aria-pressed={view === "investigation"}
          className={`titan-audit-workspace__view-button${
            view === "investigation" ? " titan-audit-workspace__view-button--active" : ""
          }`}
          onClick={() => setView("investigation")}
        >
          Investigation
        </button>
      </div>

      {selectedEvent && (
        <AuditEventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      <AuditResultSection
        state={search.result}
        view={view}
        columns={columns}
        sortDirection={search.sortDirection}
        onSortChange={search.toggleSortDirection}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function currentFilterOptions(filters: AuditFilterValues) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function AuditResultSection({
  state,
  view,
  columns,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useAuditSearch>["result"];
  view: "table" | "investigation";
  columns: DataTableColumn<AuditEventRecord>[];
  sortDirection: "asc" | "desc";
  onSortChange: () => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading audit events…" />;
    case "forbidden":
      return (
        <p className="titan-audit-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load audit events">
          {state.message}
        </Alert>
      );
    case "ready":
      return (
        <AuditResultReady
          state={state.data}
          view={view}
          columns={columns}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          onPageChange={onPageChange}
        />
      );
  }
}

function AuditResultReady({
  state,
  view,
  columns,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: AuditSearchResult;
  view: "table" | "investigation";
  columns: DataTableColumn<AuditEventRecord>[];
  sortDirection: "asc" | "desc";
  onSortChange: () => void;
  onPageChange: (page: number) => void;
}) {
  if (state.total === 0) {
    return (
      <EmptyState
        title="No audit events match these filters"
        description="Try clearing a filter or widening the date range."
      />
    );
  }

  if (view === "investigation") {
    return <AuditInvestigationView events={state.events} />;
  }

  return (
    <>
      <DataTable
        columns={columns}
        rows={state.events}
        getRowKey={(event) => event.id}
        caption="Audit events"
        sortBy="createdAt"
        sortDirection={sortDirection}
        onSortChange={onSortChange}
      />
      <Pagination
        page={state.page}
        pageSize={state.pageSize}
        total={state.total}
        onPageChange={onPageChange}
      />
    </>
  );
}
