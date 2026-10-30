/* The lint script itself runs: a missing import in check-content.mjs once only showed in CI (blog#209). */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("scripts/check-content.mjs runs to the end on the repository's content", () => {
  const script = fileURLToPath(new URL("../scripts/check-content.mjs", import.meta.url));
  const run = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.doesNotMatch(run.stderr, /ReferenceError|SyntaxError/);
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
