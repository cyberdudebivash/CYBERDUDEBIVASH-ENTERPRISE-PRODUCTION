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
import type {
  SubscriptionRecord,
  SubscriptionSortField,
  SubscriptionStatus,
} from "@titan/platform";
import { SUBSCRIPTION_STATUSES } from "@titan/platform";
import { useSession } from "../auth/SessionContext.js";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge.js";
import { useCommercialSubscriptions } from "./useCommercialSubscriptions.js";
import "./CommercialWorkspacePage.css";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  canceled: "Canceled",
  expired: "Expired",
};

export function CommercialWorkspacePage() {
  const session = useSession();
  return session.status === "authenticated" ? <CommercialWorkspaceContent /> : null;
}

/** COM-1: Subscription Administration — every real organization's own
 * subscription, server-side searched/filtered/sorted/paginated, the same
 * `*Content`-exported-for-direct-testing pattern every sibling Workspace
 * already follows. Deliberately no create-form: a subscription is created
 * by an organization's own member self-serving a plan (the Customer
 * Portal's own `/portal/subscription`), or by a Platform Administrator
 * assigning a sales-assisted plan directly on an existing organization
 * from the Detail page — never authored from a blank form here. */
export function CommercialWorkspaceContent() {
  const search = useCommercialSubscriptions();

  const columns: DataTableColumn<SubscriptionRecord>[] = [
    {
      id: "organizationId",
      header: "Organization",
      render: (subscription) => (
        <Link
          to={`/admin/commercial/${subscription.id}`}
          className="titan-commercial-workspace__name-link"
        >
          {subscription.organizationId}
        </Link>
      ),
    },
    {
      id: "planId",
      header: "Plan",
      render: (subscription) => subscription.planId,
    },
    {
      id: "status",
      header: "Status",
      render: (subscription) => <SubscriptionStatusBadge status={subscription.status} />,
    },
    {
      id: "currentPeriodEnd",
      header: "Renews / ends",
      sortable: true,
      render: (subscription) =>
        subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
          : "—",
    },
  ];

  return (
    <div className="titan-commercial-workspace">
      <div className="titan-commercial-workspace__header">
        <h1 className="titan-commercial-workspace__title">Commercial</h1>
      </div>

      <p className="titan-commercial-workspace__note">
        Every organization&rsquo;s own subscription. Provider-agnostic — no payment amount or
        invoice is modeled here, only the commercial lifecycle a real billing provider would plug
        into.
      </p>

      <SearchBar
        label="Search subscriptions"
        placeholder="Organization or plan id…"
        value={search.search}
        onChange={search.setSearch}
      />
      <FilterPanel
        fields={[
          {
            id: "status",
            label: "Status",
            value: search.status,
            options: SUBSCRIPTION_STATUSES.map((value) => ({
              value,
              label: STATUS_LABELS[value],
            })),
          },
        ]}
        onChange={(_field, value) => search.setStatus(value as SubscriptionStatus | "")}
      />

      <SubscriptionTableSection
        state={search.result}
        columns={columns}
        sortBy={search.sortBy}
        sortDirection={search.sortDirection}
        onSortChange={(field) => search.setSort(field as SubscriptionSortField)}
        onPageChange={search.setPage}
      />
    </div>
  );
}

function SubscriptionTableSection({
  state,
  columns,
  sortBy,
  sortDirection,
  onSortChange,
  onPageChange,
}: {
  state: ReturnType<typeof useCommercialSubscriptions>["result"];
  columns: DataTableColumn<SubscriptionRecord>[];
  sortBy: SubscriptionSortField;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
}) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton lines={6} label="Loading subscriptions…" />;
    case "forbidden":
      return (
        <p className="titan-commercial-workspace__note">
          Platform Administrator role required to view this.
        </p>
      );
    case "error":
      return (
        <Alert variant="error" title="Could not load subscriptions">
          {state.message}
        </Alert>
      );
    case "ready":
      if (state.data.total === 0) {
        return (
          <EmptyState
            title="No subscriptions match this search"
            description="Try a different organization id, plan, or status."
          />
        );
      }
      return (
        <>
          <DataTable
            columns={columns}
            rows={state.data.subscriptions}
            getRowKey={(subscription) => subscription.id}
            caption="Subscriptions"
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
