import { Link } from "react-router-dom";
import {
  Alert,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  Pagination,
  SearchBar,
  type DataTableColumn,
} from "@titan/design-system";
import type { UserRecord, UserSortField } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { useUserSearch } from "./useUserSearch.js";
import "./UserWorkspacePage.css";

export function UserWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <UserWorkspaceContent /> : null;
}

/**
 * Exported for direct testing, matching every other Workspace's pattern
 * (EAP-2/3/4). Deliberately smaller than `OrganizationWorkspaceContent`:
 * no `FilterPanel` (nothing categorical to filter by — `useUserSearch`'s
 * own doc comment), no saved filters/column toggle (a single search box has
 * nothing to combine or hide), and no create-form — a user's identity comes
 * from a real Auth.js sign-in, not an admin form (`UserRecord`'s doc
 * comment, `@titan/platform`), so the page explains that plainly instead of
 * offering a control that couldn't work.
 */
export function UserWorkspaceContent() {
  const search = useUserSearch();

  const columns: DataTableColumn<UserRecord>[] = [
    {
      id: "name",
      header: "Name",
      sortable: true,
      render: (user) => (
        <Link to={`/admin/users/${user.id}`} className="titan-user-workspace__name-link">
          {user.name ?? "(no name on file)"}
        </Link>
      ),
    },
    {
      id: "email",
      header: "Email",
      sortable: true,
      render: (user) => user.email ?? "—",
    },
    {
      id: "emailVerified",
      header: "Verified",
      render: (user) => (user.emailVerified ? "Yes" : "No"),
    },
  ];

  return (
    <div className="titan-user-workspace">
      <div className="titan-user-workspace__header">
        <h1 className="titan-user-workspace__title">Users</h1>
      </div>

      <p className="titan-user-workspace__note">
        Users appear here after their first sign-in — there is no manual account-creation step. Open
        a user to grant, change, or revoke their organization roles.
      </p>

      <SearchBar
        label="Search users"
        placeholder="Name or email…"
        value={search.search}
        onChange={search.setSearch}
      />

      <UserTableSection
        state={search.result}
        columns={columns}
        sortBy={search.sortBy}
        sortDirection={search.sortDirection}
        onSortChange={(field) => search.setSort(field as UserSortField)}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function UserTableSection({
  state,
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useUserSearch>["result"];
  columns: DataTableColumn<UserRecord>[];
  sortBy: UserSortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading users…" />;
    case "forbidden":
      return (
        <p className="titan-user-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load users">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No users match this search"
            description="Try a different name or email, or clear the search."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.users}
            getRowKey={(user) => user.id}
            caption="Users"
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
