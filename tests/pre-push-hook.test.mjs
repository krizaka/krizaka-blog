import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a push runs the lint gate of CI (formatting included), so a style red never reaches CI", () => {
  assert.match(read(".githooks/pre-push"), /npm run lint/);
  assert.ok(statSync(new URL("../.githooks/pre-push", import.meta.url)).mode & 0o111, "the hook is executable");
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts.prepare, /core\.hooksPath \.githooks/);
  assert.match(pkg.scripts.lint, /format:check/);
});
