// node --test: the post-deploy red is filed in krizaka-internal, never in this public repository.
// The reusable workflow files the issue with the org app's key; granting `issues: write` to the job would file it here instead.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const text = readFileSync(join(import.meta.dirname, "..", ".github", "workflows", "post-deploy.yml"), "utf8");
const code = text.replace(/#.*$/gm, "");

describe("post-deploy.yml", () => {
  it("passes the org app key so the red check is filed in krizaka-internal", () => {
    assert.match(code, /secrets:\s*\n\s+RELEASE_APP_PRIVATE_KEY:\s*\$\{\{\s*secrets\.RELEASE_APP_PRIVATE_KEY\s*\}\}/);
  });

  it("does not grant issues: write, which would file the alert in this public repository", () => {
    assert.doesNotMatch(code, /issues:\s*write/);
  });
});
