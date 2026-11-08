import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIVATE_REPOS,
  privateRepoLinkProblems,
  orgIssueLinkProblems,
  branchLineLinkProblems,
} from "../scripts/content-rules.mjs";

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

/* The bug of 2026-11-08 (krizaka-internal#2960): fifteen split Sovkora repositories went private, a dozen chapters still linked
   them, and the external link check failed every pull request of the blog. */
test("a link to a split Sovkora repository is refused, under either name; the one public krizaka/sovkora is not", () => {
  const url = "https://github.com/krizaka";
  assert.equal(privateRepoLinkProblems(`[x](${url}/sovkora-job-service/pull/72)`, "x.mdx").length, 1);
  assert.equal(privateRepoLinkProblems(`[x](${url}/orazaka-cli/pull/54)`, "x.mdx").length, 1);
  assert.deepEqual(privateRepoLinkProblems(`[x](${url}/sovkora/pull/412)`, "x.mdx"), []);
});

test("the private list names each repository once", () => {
  assert.equal(new Set(PRIVATE_REPOS).size, PRIVATE_REPOS.length);
});

/* The bug of 2026-11-06: orazaka-ai-engine#116 was transferred to the private krizaka-internal, the chapter still linked it
   and main went red; seven .github issues answered 200 with GitHub's generic page, so no link check saw them. */
test("no post or chapter links an issue of an org repository", () => {
  const problems = walk(join(root, "content"))
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => orgIssueLinkProblems(readFileSync(f, "utf8"), f.replace(root, "")));
  assert.deepEqual(problems, []);
});

test("an issue link of the org is refused, a pull request and another host are not", () => {
  assert.equal(
    orgIssueLinkProblems("[#116](https://github.com/krizaka/orazaka-ai-engine/issues/116)", "x.mdx").length,
    1,
  );
  assert.equal(orgIssueLinkProblems("[#1](https://github.com/krizaka/.github/issues/1)", "x.mdx").length, 1);
  assert.deepEqual(orgIssueLinkProblems("[#117](https://github.com/krizaka/sovkora-engine/pull/117)", "x.mdx"), []);
  assert.deepEqual(orgIssueLinkProblems("[x](https://github.com/vercel/next.js/issues/1)", "x.mdx"), []);
});

/* The bug of 2026-11-06 (krizaka-internal#2798): a line anchor on `main` went 404 with the repository's rename. */
test("no post or chapter cites lines on a branch", () => {
  const problems = walk(join(root, "content"))
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => branchLineLinkProblems(readFileSync(f, "utf8"), f.replace(root, "")));
  assert.deepEqual(problems, []);
});

test("lines cited on a branch are refused, a permalink and a whole-file link are not", () => {
  const url = "https://github.com/krizaka/sovkora-job-service/blob";
  assert.equal(branchLineLinkProblems(`[x](${url}/main/src/A.java#L696-L702)`, "x.mdx").length, 1);
  assert.deepEqual(branchLineLinkProblems(`[x](${url}/a0e727d/src/A.java#L696-L702)`, "x.mdx"), []);
  assert.deepEqual(branchLineLinkProblems(`[x](${url}/main/src/A.java)`, "x.mdx"), []);
});
