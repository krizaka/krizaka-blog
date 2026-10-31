// One download/offline block and one author line per chapter page (krizaka-internal#2002): two PRs had each added their own block
// and the merge kept both. The guard reads what the chapter page composes and what the block holds, so a second block fails here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const count = (s, re) => (s.match(re) ?? []).length;
const page = read("app/components/pages/ChapterPage.tsx");

test("a chapter page renders exactly one download/offline block", () => {
  assert.equal(count(page, /<TakeStory\b/g), 1, "one TakeStory");
  assert.equal(count(page, /<(SaveChapter|SaveSeries|OfflineHelp)\b/g), 0, "the save buttons live in that block only");
  assert.doesNotMatch(page, /bl-offline-bar|downloads\.take/, "no second, hand-made block in the page");
  const block = read("app/components/TakeStory.tsx");
  const compact = block.slice(block.indexOf("if (compact)"), block.indexOf('return (\n    <aside className="bl-take"'));
  assert.equal(count(compact, /<aside\b/g), 1, "the block is one landmark");
  assert.equal(count(compact, /<SaveChapter\b/g), 1);
  assert.equal(count(compact, /<SaveSeries\b/g), 1);
  assert.equal(count(compact, /<OfflineHelp\b/g), 1);
});

test("a chapter page has exactly one author line, with the author's own picture (the « W » mark for Oussama), the org JSON's default otherwise", () => {
  assert.equal(count(page, /<Byline\b/g), 1, "one Byline");
  const byline = read("app/components/pages/Byline.tsx");
  assert.equal(count(byline, /className="bl-byline-name"/g), 1);
  assert.match(byline, /<WuSamaMark\b/);
  assert.match(byline, /authorPicture\(/);
});

test("the old duplicate is gone: its messages and styles no longer exist", () => {
  for (const loc of ["en", "fr"]) {
    const m = JSON.parse(read(`messages/${loc}.json`));
    for (const k of ["regionLabel", "epub", "pdf", "epubSeries", "pdfSeries", "takeOffline"])
      assert.ok(!(k in m.downloads), `${loc}: downloads.${k} is unused and removed`);
    assert.ok(!("regionLabel" in m.offline), `${loc}: offline.regionLabel removed`);
  }
  assert.doesNotMatch(read("app/globals.css"), /\.bl-offline-bar|\.bl-scope\b/);
});
