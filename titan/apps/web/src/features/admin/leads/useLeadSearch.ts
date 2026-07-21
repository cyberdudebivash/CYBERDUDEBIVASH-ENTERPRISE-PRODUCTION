import { useCallback, useEffect, useState } from "react";
import type { LeadSearchOptions, LeadSearchResult, LeadSortField } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchLeads } from "./leadApi.js";
import type { LeadFilterValues } from "./leadWorkspacePreferences.js";

const DEFAULT_FILTERS: LeadFilterValues = { search: "", status: "", priority: "", assignedTo: "" };
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseLeadSearch {
  filters: LeadFilterValues;
  setFilter: (field: keyof LeadFilterValues, value: string) => void;
  applyFilters: (
    filters: LeadFilterValues,
    sort?: { sortBy: LeadSortField; sortDirection: "asc" | "desc" },
  ) => void;
  sortBy: LeadSortField;
  sortDirection: "asc" | "desc";
  setSort: (field: LeadSortField) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<LeadSearchResult>;
}

/**
 * Owns the Lead Workspace table's server-side search/filter/sort/pagination
 * state — one hook, reused the same way `useDashboardData` (EAP-1) owns the
 * Dashboard's data-loading state, including the same `SectionState`
 * loading/ready/forbidden/error convention (imported, not duplicated).
 * Only the free-text `search` field is debounced: status/priority/
 * assignedTo/sort/page changes are discrete actions (a select, a click),
 * not something a user is mid-typing.
 */
export function useLeadSearch(): UseLeadSearch {
  const [filters, setFilters] = useState<LeadFilterValues>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<LeadSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [result, setResult] = useState<SectionState<LeadSearchResult>>({ status: "loading" });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: LeadSearchOptions = {
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
    };

    searchLeads(options)
      .then((data) => {
        if (!cancelled) setResult({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setResult({ status: "forbidden" });
        } else {
          setResult({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load leads.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    filters.status,
    filters.priority,
    filters.assignedTo,
    sortBy,
    sortDirection,
    page,
  ]);

  const setFilter = useCallback((field: keyof LeadFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  /** Recalls a saved filter (or clears back to defaults) in one state
   * update, including its sort — not just its filter values. */
  const applyFilters = useCallback(
    (next: LeadFilterValues, sort?: { sortBy: LeadSortField; sortDirection: "asc" | "desc" }) => {
      setFilters(next);
      if (sort) {
        setSortBy(sort.sortBy);
        setSortDirection(sort.sortDirection);
      }
      setPage(1);
    },
    [],
  );

  const setSort = useCallback(
    (field: LeadSortField) => {
      if (sortBy === field) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDirection("desc");
      }
      setPage(1);
    },
    [sortBy],
  );

  return {
    filters,
    setFilter,
    applyFilters,
    sortBy,
    sortDirection,
    setSort,
    page,
    setPage,
    result,
  };
}
