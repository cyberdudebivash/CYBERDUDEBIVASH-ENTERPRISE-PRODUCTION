import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet } from "../artifacts/pageArtifacts";
import { validatePageArtifactSet } from "../validators/artifactValidator";
import { buildManifest } from "../manifests/buildManifest";
import { buildReportData } from "../reports/buildReport";
import { renderBuildReportMarkdown } from "../writers/reportWriter";

test("renderBuildReportMarkdown: includes every page row and the real coverage numbers", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const validation = validatePageArtifactSet(set);
  const manifest = buildManifest({
    mode: "single-page",
    outDir: "dist/seo",
    pages: [{ pageId: "about", artifacts: set, artifactPaths: [], validation }],
    siteArtifacts: [],
    durationMs: 10,
  });
  const data = buildReportData(manifest, 0);
  const markdown = renderBuildReportMarkdown(data);
  assert.ok(markdown.includes("# Build Report"));
  assert.ok(markdown.includes("`about`"));
  assert.ok(markdown.includes("Total pages: 1"));
});

test("renderBuildReportMarkdown: includes Runtime Summary only when runtimeHealth is provided", () => {
  const set = buildPageArtifactSet("about", generateSEO("about"));
  const validation = validatePageArtifactSet(set);
  const manifest = buildManifest({
    mode: "single-page",
    outDir: "dist/seo",
    pages: [{ pageId: "about", artifacts: set, artifactPaths: [], validation }],
    siteArtifacts: [],
    durationMs: 10,
  });
  const withoutHealth = renderBuildReportMarkdown(buildReportData(manifest, 0));
  assert.ok(!withoutHealth.includes("## Runtime Summary"));
});
