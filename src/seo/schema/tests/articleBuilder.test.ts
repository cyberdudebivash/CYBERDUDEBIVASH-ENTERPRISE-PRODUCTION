import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArticle } from "../builders/articleBuilder";
import { personId } from "../builders/personBuilder";
import { organizationId } from "../builders/organizationBuilder";
import { AUTHORS } from "../../config";
import { makeArticle } from "./fixtures";

test("buildArticle: composes headline/description/url from the article", () => {
  const author = AUTHORS[0];
  const node = buildArticle(makeArticle({ title: "A Headline", description: "A description.", authorId: author.id }));
  assert.equal(node["@type"], "Article");
  assert.equal(node.headline, "A Headline");
  assert.equal(node.description, "A description.");
});

test("buildArticle: author references the resolved Person by @id", () => {
  const author = AUTHORS[0];
  const node = buildArticle(makeArticle({ authorId: author.id }));
  assert.deepEqual(node.author, { "@id": personId(author) });
});

test("buildArticle: publisher references Organization by @id", () => {
  const node = buildArticle(makeArticle({ authorId: AUTHORS[0].id }));
  assert.deepEqual(node.publisher, { "@id": organizationId() });
});

test("buildArticle: throws an explicit error when authorId doesn't resolve, rather than silently substituting", () => {
  assert.throws(() => buildArticle(makeArticle({ authorId: "does-not-exist" })), /unknown authorId/);
});

test("buildArticle: merges and dedupes keywords from primaryKeyword, secondaryKeywords, and the separate keywords field", () => {
  const node = buildArticle(makeArticle({ authorId: AUTHORS[0].id, primaryKeyword: "SOC", secondaryKeywords: ["SIEM"], keywords: ["soc", "SOAR"] }));
  assert.deepEqual(node.keywords, ["SOC", "SIEM", "SOAR"]);
});
