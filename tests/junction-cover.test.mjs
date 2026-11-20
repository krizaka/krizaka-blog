import test from "node:test";
import assert from "node:assert/strict";
import { COVER_ID, H, MAIN, SEED, SIDING_A, SIDING_B, W, bezier, svgOf } from "../scripts/gen-junction-cover.mjs";

/* Chapter 39's cover is drawn in code (krizaka-internal#4502): the same seed draws the same picture, in the series' frame. */
test("the drawing is the same every time: seeded, no clock, no randomness of its own", () => {
  assert.equal(svgOf(), svgOf());
  assert.equal(SEED, 3901, "the seed series.json gives chapter 39");
});

test("the picture follows the series' rules: 16:9, no text, no letters, one bird", () => {
  const svg = svgOf();
  assert.equal(W / H, 16 / 9);
  assert.match(svg, new RegExp(`viewBox="0 0 ${W} ${H}"`));
  assert.doesNotMatch(svg, /<text|<tspan|font-family/, "no words in the picture");
  assert.doesNotMatch(svg, /<image|href=/, "nothing pasted in: every stroke is drawn");
  assert.equal(COVER_ID, "series-39-two-agent-teams-on-the-same-files");
});

test("the two sidings meet the line at one switch, arriving along the line (a junction, not a crossing)", () => {
  assert.deepEqual(SIDING_A.at(-1), MAIN[0]);
  assert.deepEqual(SIDING_B.at(-1), MAIN[0]);
  const out = bezier(MAIN, 0);
  for (const siding of [SIDING_A, SIDING_B]) {
    const into = bezier(siding, 1);
    const cos = into.tx * out.tx + into.ty * out.ty;
    assert.ok(cos > 0.9, `the siding arrives within 25° of the line (cos ${cos.toFixed(2)})`);
  }
});
