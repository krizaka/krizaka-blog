import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIVATE_REPOS, privateRepoLinkProblems } from "../scripts/content-rules.mjs";

const root = new URL("..", import.meta.url).pathname;
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/* The bug of 2026-11-04: krizaka-infra became private, the CI chapter still linked krizaka-infra#9, and the external
   link check failed every pull request. No post or chapter links a private repository of the org. */
test("no post or chapter links a private repository of the org", () => {
  const problems = walk(join(root, "content"))
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => privateRepoLinkProblems(readFileSync(f, "utf8"), f.replace(root, "")));
  assert.deepEqual(problems, []);
});

test("a link to a private repository is refused, a public one and a plain mention are not", () => {
  assert.equal(privateRepoLinkProblems("[#9](https://github.com/krizaka/krizaka-infra/issues/9)", "x.mdx").length, 1);
  assert.equal(privateRepoLinkProblems("see https://github.com/krizaka/krizaka-internal", "x.mdx").length, 1);
  assert.deepEqual(privateRepoLinkProblems("[ui](https://github.com/krizaka/krizaka-ui/pull/1)", "x.mdx"), []);
  assert.deepEqual(privateRepoLinkProblems("[a](https://github.com/krizaka/krizaka-infrastructure)", "x.mdx"), []);
  assert.deepEqual(privateRepoLinkProblems("our DNS lives in a private repository", "x.mdx"), []);
});

test("the private list names each repository once", () => {
  assert.equal(new Set(PRIVATE_REPOS).size, PRIVATE_REPOS.length);
});
