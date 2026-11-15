// The layout check was split into small functions (Sonar); a split must not drop a rule: the sr-only exemption of the
// content check and the byline actions alignment were lost once, and a chart's hidden data table failed the build.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");

test("the layout checks keep every rule", () => {
  assert.match(
    src,
    /LAYOUT_CHECKS = \[[^\]]*sidewaysScroll[^\]]*chromePastEdge[^\]]*contentPastEdge[^\]]*bylineActions[^\]]*titleOverflow[^\]]*figureHead[^\]]*bylineBeside/,
  );
  assert.match(src, /const visuallyHidden = /);
  assert.match(src, /scrolls\(e\) \|\| visuallyHidden\(e\)/);
  assert.match(src, /\.bl-byline-actions > :is\(a, button\)/);
});

test("the language link is measured at 1280 and 360 px in both themes (krizaka-internal#3907)", () => {
  assert.match(src, /const bylineLanguageLink = /);
  assert.match(src, /BYLINE_LINK_WIDTHS = \[1280, 360\]/);
  assert.match(src, /BYLINE_THEMES = \["dark", "light"\]/);
  assert.match(src, /Math\.abs\(link\.right - lead\.right\) > 2/);
  assert.match(src, /Math\.abs\(dy\) > 2/);
});

test("the byline fills the text column, so the link can sit at its right edge (krizaka-internal#3907)", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = /\.bl-byline \{([^}]*)\}/.exec(css)?.[1] ?? "";
  assert.match(rule, /width: 100%/);
  assert.match(rule, /max-width: 42\.5rem/);
});

test("the first screen links chapter 1 and the basics at 1440×900 and 360×780 (krizaka-internal#3600)", () => {
  assert.match(src, /FIRST_SCREENS = \[\s*\{ width: 1440, height: 900 \},\s*\{ width: 360, height: 780 \}/);
  assert.match(src, /const startLinksInFirstScreen = /);
  assert.match(src, /is not in the first screen/);
});

test("the basics' path must fit one screen at 1440×900, numbered 01 → N top to bottom", () => {
  assert.match(src, /const basicsPathFits = /);
  assert.match(src, /BASICS_FIT = \{ width: 1440, height: 900/);
  assert.match(src, /do not run top to bottom/);
});
