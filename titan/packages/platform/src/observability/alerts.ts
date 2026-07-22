/**
 * OPS-1 (Workstream 5). This repository has never had a deployed Cloudflare
 * environment, a paging provider (PagerDuty/Slack/email), or any real
 * production traffic (`DECISION_LOG.md`) — so there is nothing to page in
 * the way a normal SRE alerting stack would. What genuinely exists to build,
 * without fabricating a monitoring system that isn't there: a pure, tested
 * function that evaluates the exact real signals `operationsSummary` already
 * gathers (service reachability, readiness, config validity, error rate,
 * latency) against named thresholds, and returns which ones actually fire —
 * on real evidence, or not at all. Every `Alert.evidence` field is the real
 * number/value that triggered it, the same disclosure posture
 * `ServiceStatus.error` already established for this endpoint. Wiring this
 * into a real paging system is future work that needs a deployed
 * environment and a chosen provider — both named, honest blockers, not
 * silently skipped (`MONITORING_GUIDE.md`).
 */
import type { ConfigValidationResult } from "../config/validateEnv.js";
import type { ErrorRateSummary, LatencyPercentiles } from "./aggregate.js";

export type AlertSeverity = "critical" | "warning";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  evidence: Record<string, unknown>;
}

export interface AlertThresholds {
  errorRateWarning: number;
  errorRateCritical: number;
  latencyP95WarningMs: number;
  latencyP95CriticalMs: number;
}

/** Starting thresholds, chosen as reasonable SRE defaults and documented as
 * such in `MONITORING_GUIDE.md` — not derived from real production traffic,
 * since none has ever existed. Revisit once real traffic exists to tune
 * against (`MONITORING_GUIDE.md`'s own "Revisiting these thresholds" note). */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  errorRateWarning: 0.05,
  errorRateCritical: 0.2,
  latencyP95WarningMs: 500,
  latencyP95CriticalMs: 2000,
};

/** Deliberately narrower than the router's own `ServiceStatus` (just the
 * three fields this function needs) so this module never imports from
 * `router.ts` — keeps the dependency direction one-way (router depends on
 * observability, never the reverse), the same leaf-module discipline
 * `config/validateEnv.ts` already established. */
export interface ServiceHealthInput {
  name: string;
  configured: boolean;
  ok: boolean;
}

export interface AlertEvaluationInput {
  ready: boolean;
  services: ServiceHealthInput[];
  errorRate: ErrorRateSummary;
  latency: LatencyPercentiles;
  configValidation?: ConfigValidationResult;
  thresholds?: AlertThresholds;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function evaluateAlerts(input: AlertEvaluationInput): Alert[] {
  const thresholds = input.thresholds ?? DEFAULT_ALERT_THRESHOLDS;
  const alerts: Alert[] = [];
  const configInvalid = input.configValidation !== undefined && !input.configValidation.valid;

  // `computeReadiness` (router.ts) treats an invalid production config as
  // its own, higher-priority reason for "not ready" — checked before it
  // ever reaches the database check. When that's why `ready` is false, the
  // dedicated `configuration.invalid` alert below already names the real
  // cause; firing this generic one too would be two alerts describing one
  // root cause, not two independent problems.
  if (!input.ready && !configInvalid) {
    alerts.push({
      id: "readiness.not_ready",
      severity: "critical",
      message: "Readiness check is failing — a required dependency is unreachable",
      evidence: { ready: input.ready },
    });
  }

  for (const service of input.services) {
    if (service.configured && !service.ok) {
      alerts.push({
        id: `service.unreachable.${service.name}`,
        severity: "critical",
        message: `Service "${service.name}" is configured but unreachable`,
        evidence: { name: service.name, configured: service.configured, ok: service.ok },
      });
    }
  }

  if (input.configValidation && !input.configValidation.valid) {
    alerts.push({
      id: "configuration.invalid",
      severity: "critical",
      message: `Production configuration is invalid for environment "${input.configValidation.environment}"`,
      evidence: {
        environment: input.configValidation.environment,
        issues: input.configValidation.issues,
      },
    });
  }

  if (input.errorRate.total > 0) {
    if (input.errorRate.serverErrorRate >= thresholds.errorRateCritical) {
      alerts.push({
        id: "error_rate.5xx.critical",
        severity: "critical",
        message: `5xx error rate ${pct(input.errorRate.serverErrorRate)} meets or exceeds the critical threshold ${pct(thresholds.errorRateCritical)}`,
        evidence: {
          serverErrorRate: input.errorRate.serverErrorRate,
          serverErrors: input.errorRate.serverErrors,
          total: input.errorRate.total,
        },
      });
    } else if (input.errorRate.serverErrorRate >= thresholds.errorRateWarning) {
      alerts.push({
        id: "error_rate.5xx.warning",
        severity: "warning",
        message: `5xx error rate ${pct(input.errorRate.serverErrorRate)} meets or exceeds the warning threshold ${pct(thresholds.errorRateWarning)}`,
        evidence: {
          serverErrorRate: input.errorRate.serverErrorRate,
          serverErrors: input.errorRate.serverErrors,
          total: input.errorRate.total,
        },
      });
    }
  }

  if (input.latency.count > 0) {
    if (input.latency.p95 >= thresholds.latencyP95CriticalMs) {
      alerts.push({
        id: "latency.p95.critical",
        severity: "critical",
        message: `p95 request latency ${input.latency.p95}ms meets or exceeds the critical threshold ${thresholds.latencyP95CriticalMs}ms`,
        evidence: { p95: input.latency.p95, count: input.latency.count },
      });
    } else if (input.latency.p95 >= thresholds.latencyP95WarningMs) {
      alerts.push({
        id: "latency.p95.warning",
        severity: "warning",
        message: `p95 request latency ${input.latency.p95}ms meets or exceeds the warning threshold ${thresholds.latencyP95WarningMs}ms`,
        evidence: { p95: input.latency.p95, count: input.latency.count },
      });
    }
  }

  return alerts;
}

export function highestSeverity(alerts: Alert[]): AlertSeverity | null {
  if (alerts.some((alert) => alert.severity === "critical")) return "critical";
  if (alerts.length > 0) return "warning";
  return null;
}
