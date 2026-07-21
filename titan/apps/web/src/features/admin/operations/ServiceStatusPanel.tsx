import { Badge, DataTable, type DataTableColumn } from "@titan/design-system";
import type { ServiceStatus } from "@titan/platform";

export interface ServiceStatusPanelProps {
  services: ServiceStatus[];
}

const SERVICE_LABELS: Record<string, string> = {
  leads: "Lead Platform",
  assessments: "Assessment Platform",
  organizations: "Organization Platform",
  users: "Identity Platform",
  userProfiles: "Role Assignment",
  audit: "Audit Platform",
};

function serviceLabel(name: string): string {
  return SERVICE_LABELS[name] ?? name;
}

function statusBadge(service: ServiceStatus) {
  if (!service.configured) return <Badge tone="neutral">Not configured</Badge>;
  return service.ok ? (
    <Badge tone="success">Operational</Badge>
  ) : (
    <Badge tone="error">Unreachable</Badge>
  );
}

/**
 * EAP-7: Workstream 3 (Service Status) — every status here comes from a
 * real read `router.ts`'s `operationsSummary` handler just performed
 * against the real repository (page 1, pageSize 1), not a static or
 * fabricated "all green" board. `configured: false` means this deployment
 * never wired the dependency (`organizations`/`users`/`userProfiles` are
 * genuinely optional, `EAP-4`/`EAP-5`), distinct from `ok: false` (wired,
 * but the real read itself failed).
 */
export function ServiceStatusPanel({ services }: ServiceStatusPanelProps) {
  const columns: DataTableColumn<ServiceStatus>[] = [
    {
      id: "name",
      header: "Service",
      render: (service) => serviceLabel(service.name),
    },
    {
      id: "status",
      header: "Status",
      render: (service) => statusBadge(service),
    },
    {
      id: "latency",
      header: "Latency",
      render: (service) => (service.latencyMs !== undefined ? `${service.latencyMs} ms` : "—"),
    },
    {
      id: "total",
      header: "Rows",
      render: (service) => (service.total !== undefined ? service.total : "—"),
    },
    {
      id: "note",
      header: "Note",
      render: (service) => service.error ?? (service.configured ? "—" : "No dependency wired"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={services}
      getRowKey={(service) => service.name}
      caption="Service status"
    />
  );
}
