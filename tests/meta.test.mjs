import test from "node:test";
import assert from "node:assert/strict";
import { metaProblems } from "../scripts/check-meta.mjs";

/* What a built page shows a search engine: a title of at most 60 characters, a description of at most 155, one h1, and an
   alt on every image (empty for a decorative one). */
const page = ({ title = "A short title", description = "A short description.", body = "<h1>Title</h1>" } = {}) =>
  `<html><head><title>${title}</title><meta name="description" content="${description}"/></head><body>${body}</body></html>`;

test("a page within the limits has no problem", () => assert.deepEqual(metaProblems(page()), []));
test("a title over 60 characters is refused", () => assert.match(metaProblems(page({ title: "x".repeat(61) }))[0], /title/));
test("entities count as one character", () => assert.deepEqual(metaProblems(page({ title: "Ce qu&#x27;on a — " + "x".repeat(42) })), []));
test("a description over 155 characters is refused, a missing one too", () => {
  assert.match(metaProblems(page({ description: "y".repeat(156) }))[0], /description/);
  assert.match(metaProblems("<html><head><title>T</title></head><body><h1>T</h1></body></html>")[0], /description/);
});
test("one h1, no more, no less", () => {
  assert.match(metaProblems(page({ body: "<p>no heading</p>" }))[0], /h1/);
  assert.match(metaProblems(page({ body: "<h1>a</h1><h1 class='x'>b</h1>" }))[0], /h1/);
});
test("every image carries an alt", () => {
  assert.match(metaProblems(page({ body: '<h1>T</h1><img src="a.webp">' }))[0], /alt/);
  assert.deepEqual(metaProblems(page({ body: '<h1>T</h1><img alt="" src="a.webp"><img src="b.webp" alt="A riad">' })), []);
});
test("a NaN or an undefined in the text is refused (not in scripts)", () => {
  assert.match(metaProblems(page({ body: "<h1>T</h1><dd>US$NaN</dd>" }))[0], /NaN/);
  assert.match(metaProblems(page({ body: "<h1>T</h1><p>(undefined s of generation)</p>" }))[0], /undefined/);
  assert.deepEqual(metaProblems(page({ body: '<h1>T</h1><script>self.x = undefined</script>' })), []);
});
