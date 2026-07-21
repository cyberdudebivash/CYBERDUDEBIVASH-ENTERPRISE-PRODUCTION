import { useCallback, useEffect, useState } from "react";
import type { UserSearchOptions, UserSearchResult, UserSortField } from "@titan/platform";
import { ApiError } from "../../../lib/apiClient.js";
import type { SectionState } from "../dashboard/useDashboardData.js";
import { searchUsers } from "./userApi.js";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseUserSearch {
  search: string;
  setSearch: (value: string) => void;
  sortBy: UserSortField;
  sortDirection: "asc" | "desc";
  setSort: (field: UserSortField) => void;
  page: number;
  setPage: (page: number) => void;
  result: SectionState<UserSearchResult>;
}

/**
 * Owns the User Workspace table's server-side search/sort/pagination state —
 * same `SectionState` convention and debounced-search reasoning as
 * `useOrganizationSearch`/`useAssessmentSearch`, reused rather than
 * duplicated. Deliberately smaller than those two: `UserSearchOptions` has
 * no categorical field the way `OrganizationSearchOptions.status` or
 * `LeadSearchOptions.priority` do (role/organization membership live on a
 * different repository entirely — `UserSearchOptions`'s own doc comment,
 * `@titan/platform`), so there's no `FilterPanel`, no saved-filter
 * combinations, and no optional-column toggle to own here — a single search
 * box has nothing to combine with. Defaults to `name`/`asc`, the same
 * directory-listing convention `useOrganizationSearch` established (not
 * `createdAt`/`desc`, which suits an activity feed).
 */
export function useUserSearch(): UseUserSearch {
  const [search, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<UserSortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SectionState<UserSearchResult>>({ status: "loading" });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });

    const options: UserSearchOptions = {
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    };

    searchUsers(options)
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
            message: error instanceof Error ? error.message : "Could not load users.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortBy, sortDirection, page]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setSort = useCallback(
    (field: UserSortField) => {
      if (sortBy === field) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDirection("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  return { search, setSearch, sortBy, sortDirection, setSort, page, setPage, result };
}
