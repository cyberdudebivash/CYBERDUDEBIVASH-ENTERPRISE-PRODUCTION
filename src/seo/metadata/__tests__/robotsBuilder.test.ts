import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRobots } from "../robotsBuilder";
import { makePage } from "./fixtures";

test("buildRobots: passes an explicit directive through unchanged", () => {
  assert.equal(buildRobots(makePage({ robots: "noindex,nofollow" })), "noindex,nofollow");
});

test("buildRobots: defaults to index,follow when unset", () => {
  assert.equal(buildRobots(makePage({ robots: undefined })), "index,follow");
});
