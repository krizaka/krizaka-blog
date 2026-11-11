import test from "node:test";
import assert from "node:assert/strict";
import { missingFromHome } from "../scripts/check-home-posts.mjs";

/* krizaka-internal#3219: two published posts left the home page with #320 and no check said so. */
test("a published post with no link on the home page is reported, by language", () => {
  const html =
    '<a href="/fr/basics/understanding-ai-before-you-start/">x</a><a href="/fr/basics/agents-under-a-coordinator">y</a>';
  assert.deepEqual(
    missingFromHome(html, "fr", [
      "understanding-ai-before-you-start",
      "agents-under-a-coordinator",
      "let-me-show-you-the-machine",
    ]),
    ["let-me-show-you-the-machine"],
  );
});

test("the English home links posts without a language prefix", () => {
  assert.deepEqual(missingFromHome('<a href="/basics/a-post/">a</a>', "en", ["a-post"]), []);
  assert.deepEqual(missingFromHome('<a href="/fr/basics/a-post/">a</a>', "en", ["a-post"]), ["a-post"]);
});
