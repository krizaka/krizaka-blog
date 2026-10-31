// The founder's signature at the end of his chapters (founder 2026-10-31): one block per chapter he wrote, after the text and
// before the downloads; his line in both languages; the pen strokes drawn in code (no image, no font file), drawn once by the
// motion system and still under reduced motion; colours from the tokens only.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const count = (s, re) => (s.match(re) ?? []).length;
const page = read("app/components/pages/ChapterPage.tsx");
const sign = read("app/components/pages/Signature.tsx");
const css = read("app/globals.css");

test("a chapter page renders the signature block once, only for a chapter the founder wrote, before the downloads", () => {
  assert.equal(count(page, /<Signature\b/g), 1);
  assert.match(page, /\{signs\(chapter\.author\) && \(\s*<Section[^>]*>\s*<Signature locale=\{locale\} \/>/);
  assert.ok(page.indexOf("<Signature") > page.indexOf("bl-post-body"), "after the text");
  assert.ok(page.indexOf("<Signature") < page.indexOf("<TakeStory"), "before the downloads");
  assert.match(read("lib/author-picture.ts"), /SIGNING_AUTHORS = \["oussama"\]/);
  const chapters = readdirSync(new URL("../content/chapters", import.meta.url)).filter((f) => f.endsWith(".mdx"));
  const founders = chapters.filter((f) => String(matter(read(`content/chapters/${f}`)).data.author) === "oussama");
  assert.ok(founders.length > 0, "the founder signs his chapters");
});

test("the signature is drawn in code, one landmark, his line in both languages", () => {
  assert.equal(count(sign, /<aside\b/g), 1);
  assert.match(sign, /data-reveal="soft"/, "drawn once, when it arrives (the motion system)");
  assert.match(sign, /<svg[^>]*role="img"[^>]*aria-label=\{s\.name\}/);
  assert.match(sign, /pathLength=\{1\}/);
  assert.doesNotMatch(sign, /<(img|Image)\b|\.woff|https?:\/\//);
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).chapter.signature;
    assert.equal(m.name, "Wu-sama");
    assert.equal(m.fullName, "Oussama Abid");
    assert.ok(m.quote.length > 20 && m.quote.length <= 120, `${l}: one short line`);
    assert.doesNotMatch(
      m.quote,
      /faible|weak/i,
      `${l}: says « we build, we don't compete » without looking down on anyone`,
    );
    assert.ok(m.label);
  }
});

test("the strokes draw once and stay still under reduced motion; ink and accent from the tokens", () => {
  const block = css.slice(css.indexOf("/* Signature"));
  assert.match(block, /\.bl-sign\.kz-in \.bl-sign-svg path \{[^}]*animation: bl-sign-draw[^}]*both;/);
  assert.match(
    block,
    /prefers-reduced-motion: reduce\)\s*\{\s*\.bl-sign\.kz-in \.bl-sign-svg path \{\s*animation: none;/,
  );
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, "no hard-coded colour");
  assert.match(block, /stroke: currentColor/);
  assert.match(block, /stroke: var\(--kz-accent\)/);
});
