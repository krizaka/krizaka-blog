import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Chapter 18: every figure says what the test does and on which client (founder, 2026-10-30), in both languages;
// a phone recording is not cropped to 16:9.
const tags = (lang) =>
  [
    ...readFileSync(`content/chapters/how-we-test-our-uis.${lang}.mdx`, "utf8").matchAll(/<(Figure|Clip)\s[^>]*\/>/g),
  ].map((m) => m[0]);

for (const lang of ["en", "fr"]) {
  test(`chapter 18 (${lang}): every figure and clip has an alt and a caption naming its client`, () => {
    const all = tags(lang);
    assert.equal(all.length, 6);
    for (const t of all) {
      assert.match(t, /alt="[^"]{30,}"/, t);
      assert.match(t, /caption="(Android|Web)[^"]{40,}"/, t);
    }
  });
}

test("the clip player keeps the clip's own aspect ratio", () => {
  assert.match(
    readFileSync("app/components/pages/ClipPlayer.tsx", "utf8"),
    /aspectRatio: `\$\{width\} \/ \$\{height\}`/,
  );
});
