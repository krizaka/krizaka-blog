// The layout check was split into small functions (Sonar); a split must not drop a rule: the sr-only exemption of the
// content check and the byline actions alignment were lost once, and a chart's hidden data table failed the build.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");

test("the layout checks keep every rule", () => {
  assert.match(
    src,
    /LAYOUT_CHECKS = \[[^\]]*sidewaysScroll[^\]]*chromePastEdge[^\]]*contentPastEdge[^\]]*bylineActions[^\]]*titleOverflow/,
  );
  assert.match(src, /const visuallyHidden = /);
  assert.match(src, /scrolls\(e\) \|\| visuallyHidden\(e\)/);
  assert.match(src, /\.bl-byline-actions > :is\(a, button\)/);
});

test("the basics' path must fit one screen at 1440×900, numbered 01 → N top to bottom", () => {
  assert.match(src, /const basicsPathFits = /);
  assert.match(src, /BASICS_FIT = \{ width: 1440, height: 900/);
  assert.match(src, /do not run top to bottom/);
});
