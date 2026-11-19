import assert from "node:assert/strict";
import { test } from "node:test";
import { imageStartForRow, normalizeRetryIndices } from "../../src/services/bulkRetryMapping";

test("selective retries preserve original source row numbers", () => {
  assert.deepEqual(normalizeRetryIndices([7, 2, 7, -1, 100, 0], 10), [7, 2, 0]);
  assert.equal(imageStartForRow(7, 2), 14);
  assert.equal(imageStartForRow(2, 2), 4);
});

test("missing row images do not shift later retry mappings", () => {
  const images = ["r0", "r1", "r2", "r3", "r4"];
  const retry = normalizeRetryIndices([1, 4], 5);
  const ids = retry.map((i) => images[imageStartForRow(i, 1)]);
  assert.deepEqual(ids, ["r1", "r4"]);
});

test("reject invalid image counts and overflow", () => {
  assert.throws(() => imageStartForRow(3, 0));
  assert.throws(() => imageStartForRow(-1, 2));
  assert.throws(() => imageStartForRow(Number.MAX_SAFE_INTEGER, 2));
});
