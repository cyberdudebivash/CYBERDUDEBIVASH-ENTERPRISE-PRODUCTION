#!/usr/bin/env node
// PRD-1: a minimal, fast, no-auth-required set of checks that a Worker
// deployment is actually alive and correctly wired — the same checks
// documented by hand in OPERATIONAL_RUNBOOK.md's "Verifying the Worker is
// actually working" curl block, made runnable as one command and with a
// real pass/fail exit code a CI/CD pipeline step can gate on. Deliberately
// does not attempt anything authenticated (Workstream 9's "Production Smoke
// Tests" — a liveness/wiring check, not a functional test suite; the real
// functional coverage is the existing Vitest/Playwright suites, run before
// this script in every pipeline that calls it).
const args = process.argv.slice(2);
const baseUrlIndex = args.indexOf("--base-url");
const baseUrl = baseUrlIndex !== -1 ? args[baseUrlIndex + 1] : "http://localhost:8787";

const checks = [
  {
    name: "GET /health is a real 200 liveness response",
    path: "/health",
    expectStatus: 200,
    expectBody: (body) => body.status === "ok",
  },
  {
    name: "GET /health/ready proves D1 is actually reachable",
    path: "/health/ready",
    expectStatus: 200,
    expectBody: (body) => body.status === "ready",
  },
  {
    name: "GET /api/leads rejects an anonymous caller (authorization is live)",
    path: "/api/leads",
    expectStatus: 401,
  },
  {
    name: "GET /api/commercial/plans rejects an anonymous caller (authorization is live)",
    path: "/api/commercial/plans",
    expectStatus: 401,
  },
];

let failed = 0;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url);
    const statusOk = response.status === check.expectStatus;
    let bodyOk = true;
    let body;
    if (check.expectBody) {
      body = await response.json().catch(() => undefined);
      bodyOk = body !== undefined && check.expectBody(body);
    }
    if (statusOk && bodyOk) {
      console.log(`PASS  ${check.name}`);
    } else {
      failed += 1;
      console.error(
        `FAIL  ${check.name} — got status ${response.status} (expected ${check.expectStatus})` +
          (check.expectBody ? `, body ${JSON.stringify(body)}` : ""),
      );
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${check.name} — request to ${url} threw: ${error.message}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed against ${baseUrl}`);
if (failed > 0) {
  process.exit(1);
}
