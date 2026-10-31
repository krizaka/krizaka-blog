// The layout guard of the PDF books (founder 2026-10-31): the book build fails on a (nearly) blank page and on a caption that is not
// right under its picture; the pictures Chromium pushed are found back for the repair pass. Page summaries are built by hand here
// (PDF points, from the bottom of an A4 page); the generator feeds the same summaries read from its PDFs by pdf.js.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MM, PAGE, fillOf, layoutProblems, opensPart, pushedPictures } from "../lib/pdf-layout.mjs";

const TOP = PAGE.height - PAGE.top; // the first line of the text block
const BOTTOM = PAGE.bottom;
const text = (top, extra = {}) => ({ kind: "text", top, bottom: top - 12, size: 10.5, text: "Lorem", ...extra });
const image = (top, bottom) => ({ kind: "image", top, bottom });
const caption = (top, words = "— A caption") => ({ kind: "text", top, bottom: top - 10, size: 8.4, text: words });
const page = (items, header = true) => ({ width: PAGE.width, height: PAGE.height, header, items });
const full = () => page([text(TOP), text(BOTTOM + 20)]);
const opener = () => page([image(PAGE.height, PAGE.height - 156 * MM), text(400, { size: 30 })], false);

test("a page filled to its foot is full; a page with two lines on top is nearly blank", () => {
  assert.ok(fillOf(full()) > 0.9);
  assert.ok(fillOf(page([text(TOP), text(TOP - 14)])) < 0.12);
  assert.equal(fillOf(page([])), 0);
});

test("the picture pushed to the next page, leaving white behind, is refused", () => {
  const before = page([text(TOP), text(TOP - 200)]); // stops at about 30 %
  const pushed = page([image(TOP, TOP - 300), caption(TOP - 306), text(TOP - 330), text(BOTTOM + 20)]);
  const problems = layoutProblems([opener(), before, pushed, full()]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /page 2 is nearly blank/);
  assert.deepEqual(
    pushedPictures([opener(), before, pushed, full()]).map((p) => ({ index: p.index, page: p.page })),
    [{ index: 0, page: 2 }],
    "the first picture of the text pages, after page 2",
  );
  assert.ok(pushedPictures([opener(), before, pushed])[0].room > 300, "the room left under page 2's last line");
});

test("a chapter's last page may be short: the next page opens a part (an opener, or a title ≥ 20 pt)", () => {
  const end = page([text(TOP), text(TOP - 14)]);
  assert.deepEqual(layoutProblems([full(), end, opener(), full()]), []);
  const theStory = page([text(TOP, { size: 26 }), text(BOTTOM + 20)]);
  assert.ok(opensPart(theStory));
  assert.deepEqual(layoutProblems([full(), end, theStory]), []);
  assert.match(layoutProblems([full(), end, full()]).join("\n"), /page 2 is blank/);
  assert.match(layoutProblems([full(), page([]), opener()]).join("\n"), /page 2 is empty/);
});

test("a caption must sit right under its picture, on the same page", () => {
  const kept = page([text(TOP), image(TOP - 40, TOP - 400), caption(TOP - 406), text(BOTTOM + 20)]);
  assert.deepEqual(layoutProblems([kept, full()]), []);
  const orphan = page([caption(TOP), text(TOP - 20), text(BOTTOM + 20)]);
  assert.match(
    layoutProblems([full(), orphan, full()]).join("\n"),
    /page 2: the caption « — A caption » is not under its picture/,
  );
  const far = page([image(TOP, TOP - 100), text(TOP - 120), caption(TOP - 200), text(BOTTOM + 20)]);
  assert.match(layoutProblems([far, full()]).join("\n"), /is not under its picture/);
  // A line of text that opens with a dash is not a caption: only the captions' size counts.
  assert.deepEqual(layoutProblems([page([text(TOP, { text: "— she said" }), text(BOTTOM + 20)]), full()]), []);
});

test("the generator reads every PDF it makes back with the guard, and repairs before it judges", () => {
  const gen = readFileSync(new URL("../scripts/gen-downloads.mjs", import.meta.url), "utf8");
  assert.match(
    gen,
    /for \(const p of await pdfLayoutProblems\(readFileSync\(made\.pdf\)\)\) problems\.push\(`pdf layout: \$\{p\}`\)/,
  );
  assert.match(gen, /pushedPictures\(await readPages\(readFileSync\(pdf\)\)\)/);
  const css = readFileSync(new URL("../lib/ebook-style.mjs", import.meta.url), "utf8");
  assert.match(css, /figure:has\(img\) \{ break-inside: avoid;/, "a picture and its caption are never split");
  assert.match(css, /figcaption \{[^\n]*break-before: avoid/);
  assert.doesNotMatch(
    css,
    /margin-left: -\d+mm/,
    "nothing wider than the text block (Chromium would shrink every page)",
  );
});
