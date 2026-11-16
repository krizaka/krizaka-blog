import test from "node:test";
import assert from "node:assert/strict";
import { megabytes } from "../lib/file-weight.mjs";

test("a small clip is never weighed « 0.0 MB »", () => {
  assert.equal(megabytes(30303), "0.03");
  assert.equal(megabytes(4000), "0.00");
});

test("from 0.1 MB, one decimal", () => {
  assert.equal(megabytes(100000), "0.1");
  assert.equal(megabytes(2_450_000), "2.5");
});
