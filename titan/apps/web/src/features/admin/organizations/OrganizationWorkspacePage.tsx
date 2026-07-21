import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { ORGANIZATION_STATUSES } from "@titan/platform";
import type { OrganizationRecord, OrganizationSortField } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { OrganizationStatusBadge } from "./OrganizationStatusBadge.js";
import { createOrganization } from "./organizationApi.js";
import { useOrganizationSearch } from "./useOrganizationSearch.js";
import {
  OPTIONAL_COLUMNS,
  deleteSavedFilter,
  getVisibleOptionalColumns,
  listSavedFilters,
  saveFilter,
  setVisibleOptionalColumns,
  type OptionalColumnId,
  type OrganizationFilterValues,
} from "./organizationWorkspacePreferences.js";
import "./OrganizationWorkspacePage.css";

export function OrganizationWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <OrganizationWorkspaceContent /> : null;
}

const OPTIONAL_COLUMN_LABELS: Record<OptionalColumnId, string> = {
  industry: "Industry",
  region: "Region",
  tags: "Tags",
  updatedAt: "Last activity",
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Exported for direct testing, matching AssessmentWorkspaceContent's
 * pattern (EAP-3) — no fixed `me` needed here (unlike assessments' "created
 * by me" column), so this takes no props at all. */
export function OrganizationWorkspaceContent() {
  const navigate = useNavigate();
  const search = useOrganizationSearch();
  const [visibleColumns, setVisibleColumnsState] = useState(getVisibleOptionalColumns);
  const [savedFilters, setSavedFilters] = useState(listSavedFilters);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const columns: DataTableColumn<OrganizationRecord>[] = [
    {
      id: "name",
      header: "Organization",
      sortable: true,
      render: (organization) => (
        <Link
          to={`/admin/organizations/${organization.id}`}
          className="titan-organization-workspace__name-link"
        >
          {organization.name}
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      render: (organization) => <OrganizationStatusBadge status={organization.status} />,
    },
    ...(visibleColumns.includes("industry")
      ? [
          {
            id: "industry",
            header: "Industry",
            render: (organization: OrganizationRecord) => organization.industry ?? "—",
          },
        ]
      : []),
    ...(visibleColumns.includes("region")
      ? [
          {
            id: "region",
            header: "Region",
            render: (organization: OrganizationRecord) => organization.region ?? "—",
          },
        ]
      : []),
    ...(visibleColumns.includes("tags")
      ? [
          {
            id: "tags",
            header: "Tags",
            render: (organization: OrganizationRecord) =>
              organization.tags.length > 0 ? organization.tags.join(", ") : "—",
          },
        ]
      : []),
    ...(visibleColumns.includes("updatedAt")
      ? [
          {
            id: "updatedAt",
            header: "Last activity",
            sortable: true,
            render: (organization: OrganizationRecord) =>
              new Date(organization.updatedAt).toLocaleDateString(),
          },
        ]
      : []),
  ];

  return (
    <div className="titan-organization-workspace">
      <div className="titan-organization-workspace__header">
        <h1 className="titan-organization-workspace__title">Organizations</h1>
        <Button size="sm" onClick={() => setIsCreateOpen((open) => !open)}>
          {isCreateOpen ? "Cancel" : "New organization"}
        </Button>
      </div>

      {isCreateOpen && (
        <CreateOrganizationForm
          onCreated={(organization) => {
            setIsCreateOpen(false);
            search.refetch();
            navigate(`/admin/organizations/${organization.id}`);
          }}
        />
      )}

      <div className="titan-organization-workspace__controls">
        <SearchBar
          label="Search organizations"
          placeholder="Name, identifier, industry, or region…"
          value={search.filters.search}
          onChange={(value) => search.setFilter("search", value)}
        />
        <FilterPanel
          fields={[
            {
              id: "status",
              label: "Status",
              value: search.filters.status,
              options: ORGANIZATION_STATUSES.map((status) => ({
                value: status,
                label: status === "active" ? "Active" : "Archived",
              })),
            },
          ]}
          onChange={(fieldId, value) =>
            search.setFilter(fieldId as keyof OrganizationFilterValues, value)
          }
        />
        <button
          type="button"
          className="titan-organization-workspace__save-filter"
          onClick={handleSaveFilter}
        >
          Save current filter
        </button>
      </div>

      {savedFilters.length > 0 && (
        <div className="titan-organization-workspace__saved-filters" aria-label="Saved filters">
          {savedFilters.map((filter) => (
            <span key={filter.name} className="titan-organization-workspace__saved-filter">
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

      <details className="titan-organization-workspace__columns">
        <summary>Columns</summary>
        <div className="titan-organization-workspace__columns-list">
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

      <OrganizationTableSection
        state={search.result}
        columns={columns}
        sortBy={search.sortBy}
        sortDirection={search.sortDirection}
        onSortChange={(field) => search.setSort(field as OrganizationSortField)}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function CreateOrganizationForm({
  onCreated,
}: {
  onCreated: (organization: OrganizationRecord) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const organization = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
        industry: industry.trim() || null,
        region: region.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        createdAt: new Date().toISOString(),
      });
      onCreated(organization);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not create this organization.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="titan-organization-workspace__create-form" onSubmit={handleSubmit}>
      {error && (
        <Alert variant="error" title="Could not create this organization">
          {error}
        </Alert>
      )}
      <label>
        <span>Name</span>
        <input
          type="text"
          required
          value={name}
          disabled={isSubmitting}
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (!slugTouched) setSlug(slugify(value));
          }}
        />
      </label>
      <label>
        <span>Identifier (slug)</span>
        <input
          type="text"
          required
          value={slug}
          disabled={isSubmitting}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
      </label>
      <label>
        <span>Industry</span>
        <input
          type="text"
          value={industry}
          disabled={isSubmitting}
          onChange={(event) => setIndustry(event.target.value)}
        />
      </label>
      <label>
        <span>Region</span>
        <input
          type="text"
          value={region}
          disabled={isSubmitting}
          onChange={(event) => setRegion(event.target.value)}
        />
      </label>
      <label>
        <span>Tags (comma-separated)</span>
        <input
          type="text"
          value={tags}
          disabled={isSubmitting}
          onChange={(event) => setTags(event.target.value)}
        />
      </label>
      <Button type="submit" isLoading={isSubmitting} disabled={!name.trim() || !slug.trim()}>
        Create organization
      </Button>
    </form>
  );
}

function OrganizationTableSection({
  state,
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useOrganizationSearch>["result"];
  columns: DataTableColumn<OrganizationRecord>[];
  sortBy: OrganizationSortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading organizations…" />;
    case "forbidden":
      return (
        <p className="titan-organization-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load organizations">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No organizations match these filters"
            description="Try clearing a filter, searching for something else, or creating a new organization."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.organizations}
            getRowKey={(organization) => organization.id}
            caption="Organizations"
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
