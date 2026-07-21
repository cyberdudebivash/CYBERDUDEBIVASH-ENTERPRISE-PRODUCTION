import { useCallback, useEffect, useState } from "react";
import type { AuditSearchOptions, AuditSearchResult } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchAuditEvents } from "./auditApi.js";
import type { AuditFilterValues } from "./auditWorkspacePreferences.js";

const DEFAULT_FILTERS: AuditFilterValues = {
  search: "",
  actorId: "",
  organizationId: "",
  action: "",
  entityType: "",
  dateFrom: "",
  dateTo: "",
};
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseAuditSearch {
  filters: AuditFilterValues;
  setFilter: (field: keyof AuditFilterValues, value: string) => void;
  applyFilters: (filters: AuditFilterValues, sortDirection?: "asc" | "desc") => void;
  sortDirection: "asc" | "desc";
  toggleSortDirection: () => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<AuditSearchResult>;
  refetch: () => void;
}

/**
 * Owns the Audit Workspace table's server-side search/filter/sort/
 * pagination state — same shape and `SectionState` convention as
 * `useOrganizationSearch`/`useUserSearch`, reused rather than duplicated.
 * `createdAt` is the only field `AuditSearchOptions.sortBy` supports
 * (`repositories/types.ts`'s `AuditSortField`), so unlike those hooks there
 * is no `sortBy` to manage here at all — only which direction, defaulting
 * to `desc` (newest first), matching `AuditRepository.list`'s own default
 * ordering. The free-text id fields (`actorId`/`organizationId`) are
 * debounced alongside `search` — real user input, not a `<select>` — while
 * `action`/`entityType`/`dateFrom`/`dateTo` commit immediately, same as
 * every other hook's non-free-text filters.
 */
export function useAuditSearch(): UseAuditSearch {
  const [filters, setFilters] = useState<AuditFilterValues>(DEFAULT_FILTERS);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState({ search: "", actorId: "", organizationId: "" });
  const [refetchToken, setRefetchToken] = useState(0);
  const [result, setResult] = useState<SectionState<AuditSearchResult>>({ status: "loading" });

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setDebounced({
          search: filters.search,
          actorId: filters.actorId,
          organizationId: filters.organizationId,
        }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filters.search, filters.actorId, filters.organizationId]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: AuditSearchOptions = {
      sortBy: "createdAt",
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debounced.search ? { search: debounced.search } : {}),
      ...(debounced.actorId ? { actorId: debounced.actorId } : {}),
      ...(debounced.organizationId ? { organizationId: debounced.organizationId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    };

    searchAuditEvents(options)
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
            message: error instanceof Error ? error.message : "Could not load audit events.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    debounced.search,
    debounced.actorId,
    debounced.organizationId,
    filters.action,
    filters.entityType,
    filters.dateFrom,
    filters.dateTo,
    sortDirection,
    page,
    refetchToken,
  ]);

  const setFilter = useCallback((field: keyof AuditFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  const applyFilters = useCallback((next: AuditFilterValues, direction?: "asc" | "desc") => {
    setFilters(next);
    if (direction) setSortDirection(direction);
    setPage(1);
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    setPage(1);
  }, []);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  return {
    filters,
    setFilter,
    applyFilters,
    sortDirection,
    toggleSortDirection,
    page,
    setPage,
    result,
    refetch,
  };
}
