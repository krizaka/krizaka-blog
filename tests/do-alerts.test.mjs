// The blog's App Platform spec alerts the team on a failed deployment or domain (krizaka-internal#4151).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");

test("a failed deployment or domain is an app alert", () => {
  assert.match(spec, /^alerts:\n {2}- rule: DEPLOYMENT_FAILED\n {2}- rule: DOMAIN_FAILED\n/m);
});
