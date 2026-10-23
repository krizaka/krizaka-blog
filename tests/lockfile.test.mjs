import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import test from "node:test";

// The deployment's buildpack refuses a repository with more than one package manager lock file (2026-10-23: a stray
// pnpm-lock.yaml failed the blog's deploy). npm is this repository's manager: package-lock.json is the only lock.
test("one lock file: package-lock.json, and no other package manager's", () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n");
  const locks = tracked.filter((f) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(f) && !f.includes("node_modules/"));
  assert.deepEqual(locks.filter((f) => !f.startsWith("functions/")), ["package-lock.json"]);
});
