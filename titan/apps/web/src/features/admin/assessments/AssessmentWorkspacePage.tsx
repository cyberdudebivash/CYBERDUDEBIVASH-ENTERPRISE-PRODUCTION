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
import type { AssessmentRecord, AssessmentSortField } from "@titan/platform";
import { dpdpV1 } from "@titan/assessment-core";
import { useSession } from "../auth/SessionContext.js";
import type { MeResponse } from "../auth/session.js";
import { RiskBadge } from "../leads/RiskBadge.js";
import { FrameworkBadge } from "./FrameworkBadge.js";
import { ComplianceIntelligencePanel } from "./ComplianceIntelligencePanel.js";
import { useAssessmentSearch } from "./useAssessmentSearch.js";
import {
  OPTIONAL_COLUMNS,
  deleteSavedFilter,
  getVisibleOptionalColumns,
  listSavedFilters,
  saveFilter,
  setVisibleOptionalColumns,
  type AssessmentFilterValues,
  type OptionalColumnId,
} from "./assessmentWorkspacePreferences.js";
import "./AssessmentWorkspacePage.css";

export function AssessmentWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <AssessmentWorkspaceContent me={session.me} /> : null;
}

const OPTIONAL_COLUMN_LABELS: Record<OptionalColumnId, string> = {
  createdBy: "Created by",
  createdAt: "Created",
};

function formatCreatedBy(assessment: AssessmentRecord, me: MeResponse): string {
  if (!assessment.createdBy) return "—";
  return assessment.createdBy === me.userId ? "Me" : assessment.createdBy;
}

/** Exported for direct testing, matching LeadWorkspaceContent's pattern
 * (EAP-2) — a fixed `me` instead of driving `useSession()`/`SessionProvider`
 * per test. */
export function AssessmentWorkspaceContent({ me }: { me: MeResponse }) {
  const search = useAssessmentSearch();
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

  const columns: DataTableColumn<AssessmentRecord>[] = [
    {
      id: "id",
      header: "Assessment",
      render: (assessment) => (
        <Link
          to={`/admin/assessments/${assessment.id}`}
          className="titan-assessment-workspace__id-link"
        >
          #{assessment.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      id: "framework",
      header: "Framework",
      sortable: true,
      render: (assessment) => (
        <FrameworkBadge
          framework={assessment.framework}
          frameworkVersion={assessment.frameworkVersion}
        />
      ),
    },
    {
      id: "riskLevel",
      header: "Risk",
      render: (assessment) => <RiskBadge riskLevel={assessment.result.riskLevel} />,
    },
    {
      // Sortable, unlike the "Risk" badge column above — riskLevel is a fixed
      // function of score (assessment-core's riskLevelForScore), so sorting
      // by one already sorts by the other; only one column needs its own
      // sort affordance.
      id: "riskScore",
      header: "Score",
      sortable: true,
      render: (assessment) => `${assessment.result.score} / 100`,
    },
    ...(visibleColumns.includes("createdBy")
      ? [
          {
            id: "createdBy",
            header: "Created by",
            render: (assessment: AssessmentRecord) => formatCreatedBy(assessment, me),
          },
        ]
      : []),
    ...(visibleColumns.includes("createdAt")
      ? [
          {
            id: "createdAt",
            header: "Created",
            render: (assessment: AssessmentRecord) =>
              new Date(assessment.createdAt).toLocaleDateString(),
          },
        ]
      : []),
  ];

  return (
    <div className="titan-assessment-workspace">
      <h1 className="titan-assessment-workspace__title">Assessments</h1>

      <ComplianceIntelligencePanel />

      <div className="titan-assessment-workspace__controls">
        <SearchBar
          label="Search assessments"
          placeholder="Assessment id, organization, or creator…"
          value={search.filters.search}
          onChange={(value) => search.setFilter("search", value)}
        />
        <FilterPanel
          fields={[
            {
              id: "framework",
              label: "Framework",
              value: search.filters.framework,
              options: [{ value: dpdpV1.id, label: dpdpV1.framework }],
            },
            {
              id: "riskLevel",
              label: "Risk level",
              value: search.filters.riskLevel,
              options: [
                { value: "critical", label: "Critical" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ],
            },
          ]}
          onChange={(fieldId, value) =>
            search.setFilter(fieldId as keyof AssessmentFilterValues, value)
          }
        />
        <button
          type="button"
          className="titan-assessment-workspace__save-filter"
          onClick={handleSaveFilter}
        >
          Save current filter
        </button>
      </div>

      {savedFilters.length > 0 && (
        <div className="titan-assessment-workspace__saved-filters" aria-label="Saved filters">
          {savedFilters.map((filter) => (
            <span key={filter.name} className="titan-assessment-workspace__saved-filter">
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

      <details className="titan-assessment-workspace__columns">
        <summary>Columns</summary>
        <div className="titan-assessment-workspace__columns-list">
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

      <AssessmentTableSection
        state={search.result}
        columns={columns}
        sortBy={search.sortBy}
        sortDirection={search.sortDirection}
        onSortChange={(field) => search.setSort(field as AssessmentSortField)}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function AssessmentTableSection({
  state,
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useAssessmentSearch>["result"];
  columns: DataTableColumn<AssessmentRecord>[];
  sortBy: AssessmentSortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading assessments…" />;
    case "forbidden":
      return (
        <p className="titan-assessment-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load assessments">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No assessments match these filters"
            description="Try clearing a filter or searching for something else."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.assessments}
            getRowKey={(assessment) => assessment.id}
            caption="Assessments"
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
