import { useCallback, useEffect, useState } from "react";
import type {
  SubscriptionSearchResult,
  SubscriptionSortField,
  SubscriptionStatus,
} from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchCommercialSubscriptions } from "./commercialApi.js";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseCommercialSubscriptions {
  search: string;
  setSearch: (value: string) => void;
  status: SubscriptionStatus | "";
  setStatus: (value: SubscriptionStatus | "") => void;
  sortBy: SubscriptionSortField;
  sortDirection: "asc" | "desc";
  setSort: (field: SubscriptionSortField) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<SubscriptionSearchResult>;
}

/** COM-1: the Commercial Workspace table's server-side search/filter/sort/
 * pagination state — same `SectionState`/debounced-search shape
 * `useUserSearch` already established. Deliberately as minimal as that one
 * (no saved filters, no column toggle): a single status filter is the only
 * categorical field `SubscriptionSearchOptions` has, the same scope
 * reduction `useUserSearch`'s own doc comment reasons through. */
export function useCommercialSubscriptions(): UseCommercialSubscriptions {
  const [search, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [sortBy, setSortBy] = useState<SubscriptionSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SectionState<SubscriptionSearchResult>>({
    status: "loading",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    searchCommercialSubscriptions({
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
    })
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
            message: error instanceof Error ? error.message : "Could not load subscriptions.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, sortBy, sortDirection, page]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setStatusFilter = useCallback((value: SubscriptionStatus | "") => {
    setStatus(value);
    setPage(1);
  }, []);

  const setSort = useCallback(
    (field: SubscriptionSortField) => {
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
    search,
    setSearch,
    status,
    setStatus: setStatusFilter,
    sortBy,
    sortDirection,
    setSort,
    page,
    setPage,
    result,
  };
}
