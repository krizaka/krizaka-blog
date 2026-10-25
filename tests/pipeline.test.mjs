import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pipelineLayout } from "../lib/pipeline.ts";

const root = new URL("..", import.meta.url).pathname;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("a pipeline's boxes never overlap, in three columns and in one, and fit the drawing", () => {
  for (const [n, cols] of [[1, 3], [5, 3], [9, 3], [9, 1], [6, 3], [7, 2]]) {
    const { boxes, viewWidth, viewHeight } = pipelineLayout(n, { cols, width: 196 });
    assert.equal(boxes.length, n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) assert.ok(!overlap(boxes[i], boxes[j]), `${n}/${cols}: boxes ${i} and ${j} overlap`);
      assert.ok(boxes[i].x >= 0 && boxes[i].x + boxes[i].w <= viewWidth && boxes[i].y + boxes[i].h <= viewHeight, `${n}/${cols}: box ${i} is outside`);
    }
  }
});

test("every arrow joins a box to the next one, along an axis, short (the rows snake)", () => {
  const { boxes, arrows } = pipelineLayout(9, { cols: 3, width: 196 });
  assert.equal(arrows.length, 8);
  for (const a of arrows) {
    assert.ok(a.x1 === a.x2 || a.y1 === a.y2, `arrow ${a.from} is not straight`);
    assert.ok(Math.hypot(a.x2 - a.x1, a.y2 - a.y1) <= 60, `arrow ${a.from} is long: the rows must snake`);
    const [from, to] = [boxes[a.from], boxes[a.from + 1]];
    if (a.y1 === a.y2) assert.equal(a.y1, from.y + from.h / 2);
    else assert.ok(a.y1 === from.y + from.h && a.y2 < to.y + 1);
  }
  /* The second row runs right to left: the fourth box sits under the third. */
  assert.equal(boxes[3].x, boxes[2].x);
});

test("the MDX maps <Pipeline> and <Stage>, and the drawing ships with its text version (an ordered list)", () => {
  const mdx = readFileSync(`${root}app/components/pages/mdx.tsx`, "utf8");
  assert.match(mdx, /Pipeline: \(\{ label, children \}/);
  assert.match(mdx, /Stage: \(\) => null/);
  const comp = readFileSync(`${root}app/components/pages/Pipeline.tsx`, "utf8");
  assert.match(comp, /<ol className="bl-pipeline-text"/);
  assert.match(comp, /aria-hidden="true"/);
  /* Colours come from the tokens only. */
  const css = readFileSync(`${root}app/globals.css`, "utf8").split("\n").filter((l) => l.includes(".bl-pipeline"));
  for (const l of css) assert.doesNotMatch(l, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, l);
});
