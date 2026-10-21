// The blog in the Cahier (krizaka-ui ADR-004, #417; before the post « getting out of the AI look »): the family's faces,
// a calm reading page — figures numbered in their captions, footnotes set as a book's notes, lining figures — the
// single-band footer, and none of the tells of a generated template.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

test("the faces are Young Serif, Atkinson Hyperlegible Next and Courier Prime", () => {
  const fonts = read("app/fonts.ts");
  for (const face of ["atkinson-hyperlegible-next", "young-serif", "courier-prime"]) assert.match(fonts, new RegExp(face));
  assert.doesNotMatch(fonts, /inter-latin|plus-jakarta|jetbrains-mono/);
  assert.match(css, /--kz-font-display: var\(--font-kz-display\), "Young Serif"/);
});

test("no tracked capitals, no frosted backdrop, no pill, no rounded card", () => {
  assert.doesNotMatch(css, /text-transform:\s*uppercase/);
  assert.doesNotMatch(css, /letter-spacing:\s*0?\.0[2-9]em/);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur\([1-9]/);
  assert.doesNotMatch(css, /border-radius:\s*(1\d|[2-9]\d)px/);
  const pills = [...css.matchAll(/([^{}]+)\{[^}]*border-radius:\s*999px/g)].map((m) => m[1].trim());
  assert.deepEqual(pills.filter((sel) => !/mark|avatar|dot/.test(sel)), [], "a pill outside the marks");
});

test("the reading page: figures numbered in their captions, footnotes as a book's notes, lining figures", () => {
  assert.match(css, /\.bl-prose\s*\{[^}]*counter-reset: bl-fig/);
  assert.match(css, /figcaption::before\s*\{[^}]*counter\(bl-fig\)/);
  assert.match(css, /\.bl-prose \[data-footnotes\]/);
  assert.match(css, /font-variant-numeric: var\(--kz-figures/);
});

test("the footer is the family's single band: no link the family's columns already hold", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.doesNotMatch(footer, /GITHUB_ORG_URL/);
});

test("the home is the notebook: its sections numbered in the margin, the latest posts on lined paper", () => {
  const home = read("app/components/pages/HomePage.tsx");
  assert.equal((home.match(/number=\{no\(\)\} margin/g) ?? []).length, 4);
  assert.match(home, /paper="lines"/);
});
