#!/usr/bin/env node
// OPS-1 (Workstream 11): a fast, no-auth-required latency sanity check
// against the same two public endpoints `smoke-test.mjs` already exercises
// (`/health`, `/health/ready`) — deliberately not touching `smoke-test.mjs`
// itself, matching this project's own precedent (titan-deploy.yml stayed
// independent of titan-ci.yml "to avoid touching a stable file").
//
// This is a single real request's own round-trip latency, not the p95 over
// many samples `GET /api/operations/summary`'s `requestSummary.latency`
// computes from real accumulated traffic (`observability/aggregate.ts`) —
// a genuinely different, narrower measurement, not a fabricated substitute
// for it. Useful as a fast local/CI/deploy-time check precisely because it
// needs no session and no accumulated history: one real request, one real
// timing, compared against the same threshold values documented in
// `MONITORING_GUIDE.md` (kept as literals here, not imported, since this
// script runs standalone with plain Node — see that guide's own note on
// why the two threshold lists are kept in sync by hand, not by import).
const args = process.argv.slice(2);
const baseUrlIndex = args.indexOf("--base-url");
const baseUrl = baseUrlIndex !== -1 ? args[baseUrlIndex + 1] : "http://localhost:8787";

const WARNING_MS = 500;
const CRITICAL_MS = 2000;

const checks = [
  { name: "GET /health", path: "/health" },
  { name: "GET /health/ready", path: "/health/ready" },
];

let worstSeverity = "ok";

function classify(durationMs) {
  if (durationMs >= CRITICAL_MS) return "critical";
  if (durationMs >= WARNING_MS) return "warning";
  return "ok";
}

function worse(a, b) {
  const rank = { ok: 0, warning: 1, critical: 2 };
  return rank[a] >= rank[b] ? a : b;
}

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const durationMs = Date.now() - startedAt;
    const severity = classify(durationMs);
    worstSeverity = worse(worstSeverity, severity);

    if (!response.ok) {
      worstSeverity = "critical";
      console.error(`FAIL  ${check.name} — HTTP ${response.status} after ${durationMs}ms`);
      continue;
    }

    const label = severity === "ok" ? "PASS" : severity.toUpperCase();
    console.log(`${label}  ${check.name} — ${durationMs}ms`);
  } catch (error) {
    worstSeverity = "critical";
    console.error(`FAIL  ${check.name} — request to ${url} threw: ${error.message}`);
  }
}

console.log(
  `\nWorst result: ${worstSeverity} (warning >= ${WARNING_MS}ms, critical >= ${CRITICAL_MS}ms or unreachable)`,
);

// Only a critical result fails the exit code — a warning is a real,
// printed signal worth reading, not something that should flake out a CI
// run over what may just be a cold local start.
if (worstSeverity === "critical") {
  process.exit(1);
}
