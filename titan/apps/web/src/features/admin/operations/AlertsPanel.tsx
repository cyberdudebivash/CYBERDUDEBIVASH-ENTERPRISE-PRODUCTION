import { Alert as AlertBanner, Badge } from "@titan/design-system";
import type { OperationalAlert } from "@titan/platform";

export interface AlertsPanelProps {
  alerts: OperationalAlert[];
}

/**
 * OPS-1 (Workstream 10, "Incident Status" / "Operational Summary"):
 * `observability/alerts.ts`'s `evaluateAlerts` output, rendered plainly — an
 * empty array is a real, computed "nothing is currently breaching a
 * threshold," shown as an honest success state, not silently rendering
 * nothing (which would be indistinguishable from the panel having failed to
 * load). Never invents a severity or message beyond what the backend
 * actually evaluated.
 */
export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <AlertBanner variant="success" title="No alerts firing">
        Every evaluated threshold (readiness, service reachability, configuration validity, error
        rate, latency) is currently within range.
      </AlertBanner>
    );
  }

  return (
    <ul className="titan-operations-alerts">
      {alerts.map((alert) => (
        <li key={alert.id} className="titan-operations-alerts__item">
          <AlertBanner variant={alert.severity === "critical" ? "error" : "warning"}>
            <div className="titan-operations-alerts__row">
              <Badge tone={alert.severity === "critical" ? "error" : "warning"}>
                {alert.severity}
              </Badge>
              <span>{alert.message}</span>
            </div>
          </AlertBanner>
        </li>
      ))}
    </ul>
  );
}
