import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { articleConfidentialProblems, textProblems } from "../scripts/check-article-confidential.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Each planted string is the kind of private thing a figure must never carry; the guard must catch every one. */
const PLANTED = [
  ["/Users/someone/krizaka-hq/secret", /a path on someone's machine/],
  ["see krizaka-internal for the ticket", /the internal repository name/],
  ["filed in krizaka-restricted", /the restricted repository name/],
  ["read from env/blog.env", /a folder name of the private workspace/],
  ["ping me at hello@krizaka.com", /an e-mail address/],
  ["token sk-live-ABCDEFGHIJKLMNOPQRSTUV", /a key-looking value/],
  ["merged #2912 last night", /a real pull request or issue/],
  ["PR 1487 went red", /a real pull request or issue/],
  ["https://github.com/krizaka/krizaka-internal/pull/42", /a real pull request or issue/],
];

for (const [planted, pattern] of PLANTED) {
  test(`the guard catches: ${planted.slice(0, 32)}`, () => {
    const problems = textProblems("figure", planted);
    assert.ok(
      problems.some((p) => pattern.test(p)),
      `expected a problem matching ${pattern} for "${planted}", got ${JSON.stringify(problems)}`,
    );
  });
}

test("clean simulated text passes", () => {
  const clean = "PR 1 enters the queue, PR 2 goes red and is set aside, PR 3 merges. Chapter 27, § 2.";
  assert.deepEqual(textProblems("figure", clean), []);
});

test("the shipped article and its figure messages carry nothing private", () => {
  assert.deepEqual(articleConfidentialProblems(root), []);
});
