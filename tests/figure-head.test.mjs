import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// krizaka-internal#3880 part 2: a plate's head reads « fig. N — title » on one line, the description under it; an edge never
// carries LikeC4's « [...] » (the mark of two relations of one pair with different titles); the byline keeps its avatar beside the name.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");

test("no drawn edge is labelled « [...] »", () => {
  const files = readdirSync("lib").filter((f) => /^architecture.*\.json$/.test(f));
  assert.ok(files.length >= 2);
  const bad = files.flatMap((f) =>
    [...readFileSync(`lib/${f}`, "utf8").matchAll(/"label": "\[\.\.\.\]"/g)].map(
      () => `${f}: an edge is labelled [...]`,
    ),
  );
  assert.deepEqual(bad, []);
});

test("the plate head sets the figure number with the title, the description on its own line", () => {
  assert.match(css, /\.bl-prose figure > figcaption\.kz-plate-head \{\s*justify-content: flex-start;/);
  assert.match(css, /figcaption\.kz-plate-head > \.kz-plate-sub \{\s*flex-basis: 100%;/);
});

test("the byline text shares the row with the avatar", () => {
  assert.match(css, /\.bl-byline-text \{[^}]*flex: 1 1 0;/);
});

test("the layout check renders the figure head and the byline in a real browser", () => {
  assert.match(layout, /LAYOUT_CHECKS = \[[^\]]*figureHead[^\]]*bylineBeside/);
  assert.match(layout, /const figureHead = /);
  assert.match(layout, /const bylineBeside = /);
});
