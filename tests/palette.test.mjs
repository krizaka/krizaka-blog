import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brands, themes } from "@krizaka/tokens/native";
import { contrast, luminance, paletteSwatches, PALETTE_BRANDS } from "../lib/palette.ts";

const root = new URL("..", import.meta.url).pathname;

test("contrast: the WCAG 2 formula, rounded down", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.equal(contrast("#ffffff", "#ffffff"), 1);
  assert.equal(contrast("#777777", "#ffffff"), 4.4); // 4.48: never shown as 4.5
  assert.equal(luminance("#ffffff"), 1);
  assert.throws(() => luminance("hsl(0 0% 0%)"), /not a #rrggbb/);
});

test("paletteSwatches: every brand in both themes, its colours read from @krizaka/tokens", () => {
  const swatches = paletteSwatches();
  assert.equal(swatches.length, PALETTE_BRANDS.length * 2);
  for (const s of swatches) {
    assert.equal(s.accent, brands[s.brand][s.theme].accent);
    assert.equal(s.onAccent, brands[s.brand][s.theme].onAccent);
    assert.equal(s.accentText, brands[s.brand][s.theme].accentText);
    assert.equal(s.page, themes[s.theme].surface0);
  }
});

test("paletteSwatches: every pair the post shows passes WCAG AA for text (4.5:1)", () => {
  for (const s of paletteSwatches()) {
    assert.ok(s.fill >= 4.5, `${s.brand} ${s.theme}: button text ${s.fill}:1`);
    assert.ok(s.text >= 4.5, `${s.brand} ${s.theme}: accent text on the page ${s.text}:1`);
  }
});

test("<Palette> is mapped for the posts and its words exist in both languages", () => {
  const mdx = readFileSync(`${root}app/components/pages/mdx.tsx`, "utf8");
  assert.match(mdx, /Palette: \(\{ label \}/);
  for (const locale of ["en", "fr"]) {
    const words = JSON.parse(readFileSync(`${root}messages/${locale}.json`, "utf8")).palette;
    for (const key of ["dark", "light", "fill", "text", "fillRatio", "textRatio"])
      assert.ok(words[key], `${locale}: palette.${key}`);
  }
});
