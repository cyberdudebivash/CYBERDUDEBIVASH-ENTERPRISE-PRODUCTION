import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPerson, personId } from "../builders/personBuilder";
import { makeAuthor } from "./fixtures";

test("buildPerson: composes name/role/bio into a Person node", () => {
  const author = makeAuthor({ name: "Jane Doe", role: "Founder", bio: "A bio." });
  const node = buildPerson(author);
  assert.equal(node["@type"], "Person");
  assert.equal(node.name, "Jane Doe");
  assert.equal(node.jobTitle, "Founder");
  assert.equal(node.description, "A bio.");
});

test("buildPerson: @id uses the author's own url when present", () => {
  const author = makeAuthor({ id: "jane", url: "https://www.cyberdudebivash.com/about.html" });
  assert.equal(personId(author), "https://www.cyberdudebivash.com/about.html#person-jane");
});

test("buildPerson: @id falls back to the site domain when the author has no url", () => {
  const author = makeAuthor({ id: "team", url: undefined });
  assert.equal(personId(author), "https://www.cyberdudebivash.com/#person-team");
});

test("buildPerson: handles an author with no image or sameAs", () => {
  const node = buildPerson(makeAuthor({ image: undefined, sameAs: undefined }));
  assert.equal(node.image, undefined);
  assert.equal(node.sameAs, undefined);
});
