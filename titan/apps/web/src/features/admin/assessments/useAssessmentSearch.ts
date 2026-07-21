import { useCallback, useEffect, useState } from "react";
import type {
  AssessmentSearchOptions,
  AssessmentSearchResult,
  AssessmentSortField,
} from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchAssessments } from "./assessmentApi.js";
import type { AssessmentFilterValues } from "./assessmentWorkspacePreferences.js";

const DEFAULT_FILTERS: AssessmentFilterValues = { search: "", framework: "", riskLevel: "" };
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseAssessmentSearch {
  filters: AssessmentFilterValues;
  setFilter: (field: keyof AssessmentFilterValues, value: string) => void;
  applyFilters: (
    filters: AssessmentFilterValues,
    sort?: { sortBy: AssessmentSortField; sortDirection: "asc" | "desc" },
  ) => void;
  sortBy: AssessmentSortField;
  sortDirection: "asc" | "desc";
  setSort: (field: AssessmentSortField) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<AssessmentSearchResult>;
}

/**
 * Owns the Assessment Workspace table's server-side search/filter/sort/
 * pagination state — same shape and `SectionState` convention as
 * `useLeadSearch` (EAP-2), reused rather than duplicated. Only the
 * free-text `search` field is debounced, same reasoning as `useLeadSearch`.
 */
export function useAssessmentSearch(): UseAssessmentSearch {
  const [filters, setFilters] = useState<AssessmentFilterValues>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<AssessmentSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [result, setResult] = useState<SectionState<AssessmentSearchResult>>({ status: "loading" });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: AssessmentSearchOptions = {
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.framework ? { framework: filters.framework } : {}),
      ...(filters.riskLevel ? { riskLevel: filters.riskLevel } : {}),
    };

    searchAssessments(options)
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
            message: error instanceof Error ? error.message : "Could not load assessments.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filters.framework, filters.riskLevel, sortBy, sortDirection, page]);

  const setFilter = useCallback((field: keyof AssessmentFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  const applyFilters = useCallback(
    (
      next: AssessmentFilterValues,
      sort?: { sortBy: AssessmentSortField; sortDirection: "asc" | "desc" },
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
    (field: AssessmentSortField) => {
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
