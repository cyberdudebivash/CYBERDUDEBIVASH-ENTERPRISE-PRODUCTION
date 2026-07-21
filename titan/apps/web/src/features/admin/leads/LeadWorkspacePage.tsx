import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  DataTable,
  EmptyState,
  FilterPanel,
  LoadingSkeleton,
  Pagination,
  SearchBar,
  type DataTableColumn,
} from "@titan/design-system";
import type { LeadRecord, LeadSortField } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { RiskBadge } from "./RiskBadge.js";
import { StatusBadge } from "./StatusBadge.js";
import { useLeadSearch } from "./useLeadSearch.js";
import {
  OPTIONAL_COLUMNS,
  deleteSavedFilter,
  getVisibleOptionalColumns,
  listSavedFilters,
  saveFilter,
  setVisibleOptionalColumns,
  type LeadFilterValues,
  type OptionalColumnId,
} from "./leadWorkspacePreferences.js";
import "./LeadWorkspacePage.css";

export function LeadWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <LeadWorkspaceContent me={session.me} /> : null;
}

const OPTIONAL_COLUMN_LABELS: Record<OptionalColumnId, string> = {
  email: "Email",
  assignedTo: "Assigned to",
  tags: "Tags",
  createdAt: "Created",
};

function formatAssignee(lead: LeadRecord, me: MeResponse): string {
  if (!lead.assignedTo) return "Unassigned";
  return lead.assignedTo === me.userId ? "Me" : lead.assignedTo;
}

/** Exported for direct testing, matching DashboardContent's pattern
 * (EAP-1) — a fixed `me` instead of driving `useSession()`/`SessionProvider`
 * per test. */
export function LeadWorkspaceContent({ me }: { me: MeResponse }) {
  const search = useLeadSearch();
  const [visibleColumns, setVisibleColumnsState] = useState(getVisibleOptionalColumns);
  const [savedFilters, setSavedFilters] = useState(listSavedFilters);

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
    saveFilter({
      name,
      filters: search.filters,
      sortBy: search.sortBy,
      sortDirection: search.sortDirection,
    });
    setSavedFilters(listSavedFilters());
  }

  function handleApplySavedFilter(name: string) {
    const saved = savedFilters.find((filter) => filter.name === name);
    if (!saved) return;
    search.applyFilters(saved.filters, {
      sortBy: saved.sortBy,
      sortDirection: saved.sortDirection,
    });
  }

  function handleDeleteSavedFilter(name: string) {
    deleteSavedFilter(name);
    setSavedFilters(listSavedFilters());
  }

  const columns: DataTableColumn<LeadRecord>[] = [
    {
      id: "name",
      header: "Name",
      sortable: true,
      render: (lead) => (
        <Link to={`/admin/leads/${lead.id}`} className="titan-lead-workspace__name-link">
          {lead.name}
        </Link>
      ),
    },
    { id: "company", header: "Company", sortable: true, render: (lead) => lead.company },
    {
      id: "status",
      header: "Status",
      sortable: true,
      render: (lead) => <StatusBadge status={lead.status} />,
    },
    {
      id: "priority",
      header: "Priority",
      sortable: true,
      render: (lead) => <PriorityBadge priority={lead.priority} />,
    },
    {
      id: "risk",
      header: "Risk",
      sortable: true,
      render: (lead) => <RiskBadge riskLevel={lead.result.riskLevel} />,
    },
    ...(visibleColumns.includes("email")
      ? [{ id: "email", header: "Email", render: (lead: LeadRecord) => lead.email }]
      : []),
    ...(visibleColumns.includes("assignedTo")
      ? [
          {
            id: "assignedTo",
            header: "Assigned to",
            render: (lead: LeadRecord) => formatAssignee(lead, me),
          },
        ]
      : []),
    ...(visibleColumns.includes("tags")
      ? [
          {
            id: "tags",
            header: "Tags",
            render: (lead: LeadRecord) => (lead.tags.length > 0 ? lead.tags.join(", ") : "—"),
          },
        ]
      : []),
    ...(visibleColumns.includes("createdAt")
      ? [
          {
            id: "createdAt",
            header: "Created",
            render: (lead: LeadRecord) => new Date(lead.timestamp).toLocaleDateString(),
          },
        ]
      : []),
  ];

  return (
    <div className="titan-lead-workspace">
      <h1 className="titan-lead-workspace__title">Leads</h1>

      <div className="titan-lead-workspace__controls">
        <SearchBar
          label="Search leads"
          placeholder="Name, email, or company…"
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
                { value: "new", label: "New" },
                { value: "contacted", label: "Contacted" },
                { value: "qualified", label: "Qualified" },
                { value: "disqualified", label: "Disqualified" },
                { value: "converted", label: "Converted" },
              ],
            },
            {
              id: "priority",
              label: "Priority",
              value: search.filters.priority,
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ],
            },
            {
              id: "assignedTo",
              label: "Assigned to",
              value: search.filters.assignedTo,
              // No user directory exists yet (User Management is a later
              // EAP phase, ROADMAP.md) — "Me" and "Unassigned" are the only
              // two options that can be shown honestly without fabricating
              // a picker over users this app has no way to list.
              options: [
                { value: me.userId, label: "Me" },
                { value: "unassigned", label: "Unassigned" },
              ],
            },
          ]}
          onChange={(fieldId, value) => search.setFilter(fieldId as keyof LeadFilterValues, value)}
        />
        <button
          type="button"
          className="titan-lead-workspace__save-filter"
          onClick={handleSaveFilter}
        >
          Save current filter
        </button>
      </div>

      {savedFilters.length > 0 && (
        <div className="titan-lead-workspace__saved-filters" aria-label="Saved filters">
          {savedFilters.map((filter) => (
            <span key={filter.name} className="titan-lead-workspace__saved-filter">
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

      <details className="titan-lead-workspace__columns">
        <summary>Columns</summary>
        <div className="titan-lead-workspace__columns-list">
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

      <LeadTableSection
        state={search.result}
        columns={columns}
        sortBy={search.sortBy}
        sortDirection={search.sortDirection}
        onSortChange={(field) => search.setSort(field as LeadSortField)}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function LeadTableSection({
  state,
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useLeadSearch>["result"];
  columns: DataTableColumn<LeadRecord>[];
  sortBy: LeadSortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading leads…" />;
    case "forbidden":
      return (
        <p className="titan-lead-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load leads">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No leads match these filters"
            description="Try clearing a filter or searching for something else."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.leads}
            getRowKey={(lead) => lead.id}
            caption="Leads"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
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
