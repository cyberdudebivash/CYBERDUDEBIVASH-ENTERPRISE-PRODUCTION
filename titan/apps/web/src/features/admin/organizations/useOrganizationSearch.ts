import { useCallback, useEffect, useState } from "react";
import type {
  OrganizationSearchOptions,
  OrganizationSearchResult,
  OrganizationSortField,
} from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchOrganizations } from "./organizationApi.js";
import type { OrganizationFilterValues } from "./organizationWorkspacePreferences.js";

const DEFAULT_FILTERS: OrganizationFilterValues = {
  search: "",
  status: "",
  industry: "",
  region: "",
};
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseOrganizationSearch {
  filters: OrganizationFilterValues;
  setFilter: (field: keyof OrganizationFilterValues, value: string) => void;
  applyFilters: (
    filters: OrganizationFilterValues,
    sort?: { sortBy: OrganizationSortField; sortDirection: "asc" | "desc" },
  ) => void;
  sortBy: OrganizationSortField;
  sortDirection: "asc" | "desc";
  setSort: (field: OrganizationSortField) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<OrganizationSearchResult>;
  refetch: () => void;
}

/**
 * Owns the Organization Workspace table's server-side search/filter/sort/
 * pagination state — same shape and `SectionState` convention as
 * `useAssessmentSearch`/`useLeadSearch`, reused rather than duplicated. Only
 * the free-text `search` field is debounced, same reasoning as those hooks.
 * Defaults to `name`/`asc` — an organization directory's natural order
 * (matching `OrganizationRepository.list`'s own existing ascending-by-name
 * convention) — unlike Lead/Assessment's `createdAt`/`desc` default, which
 * suits an activity feed, not a directory.
 */
export function useOrganizationSearch(): UseOrganizationSearch {
  const [filters, setFilters] = useState<OrganizationFilterValues>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<OrganizationSortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refetchToken, setRefetchToken] = useState(0);
  const [result, setResult] = useState<SectionState<OrganizationSearchResult>>({
    status: "loading",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: OrganizationSearchOptions = {
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.industry ? { industry: filters.industry } : {}),
      ...(filters.region ? { region: filters.region } : {}),
    };

    searchOrganizations(options)
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
            message: error instanceof Error ? error.message : "Could not load organizations.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    filters.status,
    filters.industry,
    filters.region,
    sortBy,
    sortDirection,
    page,
    refetchToken,
  ]);

  const setFilter = useCallback((field: keyof OrganizationFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  const applyFilters = useCallback(
    (
      next: OrganizationFilterValues,
      sort?: { sortBy: OrganizationSortField; sortDirection: "asc" | "desc" },
    ) => {
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
    (field: OrganizationSortField) => {
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

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

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
    refetch,
  };
}
