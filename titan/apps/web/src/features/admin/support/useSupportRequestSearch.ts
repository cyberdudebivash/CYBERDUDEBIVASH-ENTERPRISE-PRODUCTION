import { useCallback, useEffect, useState } from "react";
import type { SupportRequestSearchOptions, SupportRequestSearchResult } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchSupportRequests } from "./supportRequestApi.js";

export interface SupportRequestFilterValues {
  search: string;
  status: string;
}

const DEFAULT_FILTERS: SupportRequestFilterValues = { search: "", status: "" };
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseSupportRequestSearch {
  filters: SupportRequestFilterValues;
  setFilter: (field: keyof SupportRequestFilterValues, value: string) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<SupportRequestSearchResult>;
  /** Re-runs the current search — called after a status change so the
   * table reflects it immediately, the same "just refetch" reasoning
   * `useLeadDetail`'s own patch handling uses rather than mutating local
   * state in place. */
  refresh: () => void;
}

/**
 * Owns the Admin Support Queue's server-side search/filter/pagination
 * state — same `SectionState` loading/ready/forbidden/error convention
 * `useLeadSearch` already established for EAP-2, simplified for this
 * entity's smaller filter surface (no sort field beyond createdAt, no
 * priority/assignedTo).
 */
export function useSupportRequestSearch(): UseSupportRequestSearch {
  const [filters, setFilters] = useState<SupportRequestFilterValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [result, setResult] = useState<SectionState<SupportRequestSearchResult>>({
    status: "loading",
  });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: SupportRequestSearchOptions = {
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(filters.status
        ? { status: filters.status as SupportRequestSearchOptions["status"] }
        : {}),
    };

    searchSupportRequests(options)
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
            message: error instanceof Error ? error.message : "Could not load support requests.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filters.status, page, refreshToken]);

  const setFilter = useCallback((field: keyof SupportRequestFilterValues, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  }, []);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { filters, setFilter, page, setPage, result, refresh };
}
