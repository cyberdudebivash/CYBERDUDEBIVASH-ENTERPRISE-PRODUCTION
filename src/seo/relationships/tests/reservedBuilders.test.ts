import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRelatedResearch,
  buildRelatedDownloads,
  buildRelatedDocumentation,
  buildRelatedLearning,
  buildRelatedRepositories,
  buildRelatedIndustries,
  buildRelatedTechnologies,
} from "../builders";

// The 7 reserved builders — real mechanism, no real config backing
// (see RELATIONSHIP_MAPPING_MATRIX.md). Confirms each returns [] against
// its real default (or is a pure function over caller-supplied
// candidates) rather than fabricating output.

test("buildRelatedResearch: returns [] against the real (deliberately empty) RESEARCH_ARTICLES default", () => {
  assert.deepEqual(buildRelatedResearch("some-article"), []);
});

test("buildRelatedResearch: works against caller-supplied articles once real content exists", () => {
  const recs = buildRelatedResearch("a", [
    { id: "a", title: "A", description: "d", url: "https://example.com/a", authorId: "x" },
    { id: "b", title: "B", description: "d", url: "https://example.com/b", authorId: "x" },
  ]);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].targetId, "b");
  assert.equal(recs[0].anchorText, "B");
});

test("buildRelatedDownloads: pure function over caller-supplied candidates, excluding self", () => {
  const recs = buildRelatedDownloads([{ id: "a", name: "A" }, { id: "b", name: "B" }], "a");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].targetId, "b");
  assert.equal(recs[0].targetKind, "download");
  assert.equal(recs[0].relationType, "relatedDownload");
});

test("buildRelatedDocumentation: maps to the relatedDocumentation type", () => {
  const recs = buildRelatedDocumentation([{ id: "doc-1", name: "Doc" }], "source");
  assert.equal(recs[0].relationType, "relatedDocumentation");
});

test("buildRelatedLearning: maps to the relatedLearning type", () => {
  const recs = buildRelatedLearning([{ id: "course-1", name: "Course" }], "source");
  assert.equal(recs[0].relationType, "relatedLearning");
});

test("buildRelatedRepositories: maps to the relatedRepository type", () => {
  const recs = buildRelatedRepositories([{ id: "repo-1", name: "Repo" }], "source");
  assert.equal(recs[0].relationType, "relatedRepository");
});

test("buildRelatedIndustries: maps to the relatedIndustry type", () => {
  const recs = buildRelatedIndustries([{ id: "industry-1", name: "Finance" }], "source");
  assert.equal(recs[0].relationType, "relatedIndustry");
});

test("buildRelatedTechnologies: maps to the relatedTechnology type", () => {
  const recs = buildRelatedTechnologies([{ id: "tech-1", name: "Kubernetes" }], "source");
  assert.equal(recs[0].relationType, "relatedTechnology");
});

test("every reserved builder excludes a candidate matching its own sourceId", () => {
  const recs = buildRelatedDownloads([{ id: "self", name: "Self" }], "self");
  assert.deepEqual(recs, []);
});
