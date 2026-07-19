import { test } from "node:test";
import assert from "node:assert/strict";
import { buildValidatedConfigurationReport } from "../integration/configurationIntegration";

test("buildValidatedConfigurationReport: returns the real report when the configuration has zero errors", () => {
  const report = buildValidatedConfigurationReport();
  assert.equal(report.summary.errorCount, 0);
  assert.equal(report.results.length, 16);
});

test("buildValidatedConfigurationReport: never throws against the real, committed configuration", () => {
  assert.doesNotThrow(() => buildValidatedConfigurationReport());
});
