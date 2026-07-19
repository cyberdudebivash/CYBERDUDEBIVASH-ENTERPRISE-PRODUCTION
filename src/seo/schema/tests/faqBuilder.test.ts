import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFAQPage } from "../builders/faqBuilder";

test("buildFAQPage: converts question/answer entries into Question nodes", () => {
  const node = buildFAQPage("https://www.cyberdudebivash.com/compliance.html", [{ question: "Is it DPDP compliant?", answer: "Yes." }]);
  assert.equal(node["@type"], "FAQPage");
  assert.equal(node.mainEntity.length, 1);
  assert.equal(node.mainEntity[0]["@type"], "Question");
  assert.equal(node.mainEntity[0].name, "Is it DPDP compliant?");
  assert.equal(node.mainEntity[0].acceptedAnswer.text, "Yes.");
});

test("buildFAQPage: @id is derived from the given page URL", () => {
  const node = buildFAQPage("/compliance.html", []);
  assert.equal(node["@id"], "https://www.cyberdudebivash.com/compliance.html#faq");
});

test("buildFAQPage: handles an empty entries list", () => {
  const node = buildFAQPage("/compliance.html", []);
  assert.deepEqual(node.mainEntity, []);
});
