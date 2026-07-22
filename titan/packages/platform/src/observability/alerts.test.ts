import { describe, expect, it } from "vitest";
import { DEFAULT_ALERT_THRESHOLDS, evaluateAlerts, highestSeverity } from "./alerts.js";
import type { AlertEvaluationInput } from "./alerts.js";
import type { ErrorRateSummary, LatencyPercentiles } from "./aggregate.js";

const ZERO_ERROR_RATE: ErrorRateSummary = {
  total: 0,
  serverErrors: 0,
  clientErrors: 0,
  serverErrorRate: 0,
  clientErrorRate: 0,
};

const ZERO_LATENCY: LatencyPercentiles = { count: 0, p50: 0, p95: 0, p99: 0 };

function baseInput(overrides: Partial<AlertEvaluationInput> = {}): AlertEvaluationInput {
  return {
    ready: true,
    services: [],
    errorRate: ZERO_ERROR_RATE,
    latency: ZERO_LATENCY,
    ...overrides,
  };
}

describe("evaluateAlerts", () => {
  it("returns no alerts for a fully healthy snapshot", () => {
    expect(evaluateAlerts(baseInput())).toEqual([]);
  });

  it("fires a critical readiness alert when ready is false", () => {
    const alerts = evaluateAlerts(baseInput({ ready: false }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "readiness.not_ready", severity: "critical" });
    expect(alerts[0]!.evidence).toEqual({ ready: false });
  });

  it("fires a critical alert per unreachable configured service, skipping unconfigured ones", () => {
    const alerts = evaluateAlerts(
      baseInput({
        services: [
          { name: "leads", configured: true, ok: true },
          { name: "audit", configured: true, ok: false },
          { name: "organizations", configured: false, ok: false },
        ],
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "service.unreachable.audit", severity: "critical" });
  });

  it("fires a critical alert when configValidation is present and invalid", () => {
    const alerts = evaluateAlerts(
      baseInput({
        configValidation: {
          environment: "production",
          isProductionTier: true,
          valid: false,
          issues: [{ field: "AUTH_SECRET", severity: "error", message: "not set" }],
        },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "configuration.invalid", severity: "critical" });
  });

  it("fires only configuration.invalid, not the generic readiness alert, when an invalid config is why ready is false", () => {
    // computeReadiness (router.ts) treats invalid config as its own,
    // higher-priority reason for non-readiness, checked before the database
    // — so when both are set this way together, only the more specific
    // alert should appear, not a redundant second alert for the same cause.
    const alerts = evaluateAlerts(
      baseInput({
        ready: false,
        configValidation: {
          environment: "production",
          isProductionTier: true,
          valid: false,
          issues: [{ field: "AUTH_SECRET", severity: "error", message: "not set" }],
        },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "configuration.invalid" });
  });

  it("still fires the generic readiness alert when ready is false for a reason other than config", () => {
    // e.g. config is valid but the real database check itself failed.
    const alerts = evaluateAlerts(
      baseInput({
        ready: false,
        configValidation: {
          environment: "production",
          isProductionTier: true,
          valid: true,
          issues: [],
        },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "readiness.not_ready" });
  });

  it("does not fire when configValidation is present and valid", () => {
    const alerts = evaluateAlerts(
      baseInput({
        configValidation: {
          environment: "production",
          isProductionTier: true,
          valid: true,
          issues: [],
        },
      }),
    );
    expect(alerts).toEqual([]);
  });

  it("does not fire an error-rate alert when total is 0, regardless of rate fields", () => {
    // Defensive case: total 0 must never divide-by-zero into a false positive.
    const alerts = evaluateAlerts(
      baseInput({ errorRate: { ...ZERO_ERROR_RATE, serverErrorRate: 1 } }),
    );
    expect(alerts).toEqual([]);
  });

  it("fires a warning at the exact warning threshold (inclusive boundary)", () => {
    const alerts = evaluateAlerts(
      baseInput({
        errorRate: {
          total: 100,
          serverErrors: 5,
          clientErrors: 0,
          serverErrorRate: DEFAULT_ALERT_THRESHOLDS.errorRateWarning,
          clientErrorRate: 0,
        },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "error_rate.5xx.warning", severity: "warning" });
  });

  it("fires critical (not warning) once the critical error-rate threshold is met", () => {
    const alerts = evaluateAlerts(
      baseInput({
        errorRate: {
          total: 100,
          serverErrors: 20,
          clientErrors: 0,
          serverErrorRate: DEFAULT_ALERT_THRESHOLDS.errorRateCritical,
          clientErrorRate: 0,
        },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: "error_rate.5xx.critical", severity: "critical" });
  });

  it("fires a latency warning, then critical, at the documented thresholds", () => {
    const warning = evaluateAlerts(
      baseInput({
        latency: {
          count: 10,
          p50: 100,
          p95: DEFAULT_ALERT_THRESHOLDS.latencyP95WarningMs,
          p99: 600,
        },
      }),
    );
    expect(warning).toHaveLength(1);
    expect(warning[0]).toMatchObject({ id: "latency.p95.warning", severity: "warning" });

    const critical = evaluateAlerts(
      baseInput({
        latency: {
          count: 10,
          p50: 100,
          p95: DEFAULT_ALERT_THRESHOLDS.latencyP95CriticalMs,
          p99: 2500,
        },
      }),
    );
    expect(critical).toHaveLength(1);
    expect(critical[0]).toMatchObject({ id: "latency.p95.critical", severity: "critical" });
  });

  it("does not fire a latency alert when count is 0 (no real samples yet)", () => {
    const alerts = evaluateAlerts(
      baseInput({ latency: { count: 0, p50: 0, p95: 999999, p99: 999999 } }),
    );
    expect(alerts).toEqual([]);
  });

  it("combines multiple independently-triggered alerts in one evaluation", () => {
    const alerts = evaluateAlerts(
      baseInput({
        ready: false,
        services: [{ name: "audit", configured: true, ok: false }],
        errorRate: {
          total: 10,
          serverErrors: 10,
          clientErrors: 0,
          serverErrorRate: 1,
          clientErrorRate: 0,
        },
      }),
    );
    expect(alerts.map((a) => a.id).sort()).toEqual(
      ["error_rate.5xx.critical", "readiness.not_ready", "service.unreachable.audit"].sort(),
    );
  });

  it("respects custom thresholds when supplied", () => {
    const alerts = evaluateAlerts(
      baseInput({
        latency: { count: 5, p50: 10, p95: 50, p99: 60 },
        thresholds: { ...DEFAULT_ALERT_THRESHOLDS, latencyP95WarningMs: 40 },
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe("latency.p95.warning");
  });
});

describe("highestSeverity", () => {
  it("returns null for no alerts", () => {
    expect(highestSeverity([])).toBeNull();
  });

  it("returns warning when only warnings are present", () => {
    expect(highestSeverity([{ id: "a", severity: "warning", message: "m", evidence: {} }])).toBe(
      "warning",
    );
  });

  it("returns critical when any critical alert is present, even alongside warnings", () => {
    expect(
      highestSeverity([
        { id: "a", severity: "warning", message: "m", evidence: {} },
        { id: "b", severity: "critical", message: "m", evidence: {} },
      ]),
    ).toBe("critical");
  });
});
