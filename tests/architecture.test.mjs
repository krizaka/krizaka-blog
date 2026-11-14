import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE_PALETTE, paletteFromCss, pathOf, svgString, svgTree, textVersion, wrap } from "../lib/architecture.ts";
import {
  MODEL,
  OUT,
  TRANSLATIONS,
  VIEWS,
  sha256,
  staleProblems,
  translateView,
  used,
  viewOf,
} from "../scripts/gen-architecture.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const data = JSON.parse(read(OUT));
const sources = () => ({ model: read(MODEL), translations: read(TRANSLATIONS) });

test("the layout was made from the model and the translations as they are now, and the org's check said ok", () => {
  assert.deepEqual(staleProblems(data, sources()), []);
  assert.equal(data.check.status, "ok");
  assert.equal(data.check.system, "platform.tooling");
  assert.ok(
    data.check.elements.every((id) => id.startsWith("platform.tooling.")),
    "every element added lives in the tooling",
  );
});

test("a model changed after its layout is stale", () => {
  const s = sources();
  const problems = staleProblems(data, { ...s, model: `${s.model}\n// edited` });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /made from another content\/diagrams\/krizaka-agents\.c4/);
});

test("a layout whose check is not ok, or that lacks a view, is refused", () => {
  const s = sources();
  assert.ok(staleProblems({ ...data, check: { status: "invalid" } }, s).some((p) => p.includes("invalid")));
  const views = { en: data.views.en.filter((v) => v.id !== "pr_life"), fr: data.views.fr };
  assert.ok(staleProblems({ ...data, views }, s).some((p) => p.includes("no view pr_life in en")));
});

test("every view is there in both languages, and the French one is fully translated with no unused entry", () => {
  const map = JSON.parse(read(TRANSLATIONS));
  for (const id of VIEWS) {
    const en = data.views.en.find((v) => v.id === id);
    const fr = data.views.fr.find((v) => v.id === id);
    assert.ok(en && fr, id);
    assert.deepEqual(
      fr.nodes.map((n) => [n.id, n.x, n.y]),
      en.nodes.map((n) => [n.id, n.x, n.y]),
      "one layout, two languages",
    );
    const missing = new Set();
    assert.deepEqual(translateView(en, map, missing), fr);
    assert.equal(missing.size, 0);
  }
  const all = used(data.views.en);
  assert.deepEqual(
    Object.keys(map).filter((k) => !all.has(k)),
    [],
  );
});

test("the dynamic view numbers its steps in the model's order", () => {
  const v = data.views.en.find((x) => x.id === "pr_life");
  assert.equal(v.dynamic, true);
  assert.deepEqual(
    v.edges.map((e) => e.step),
    v.edges.map((_, i) => i + 1),
  );
});

test("viewOf reads LikeC4's laid-out view: compounds, flattened labels, back edges, step numbers", () => {
  const v = viewOf({
    id: "x",
    title: "X",
    _type: "dynamic",
    bounds: { x: 0, y: 0, width: 10, height: 10 },
    nodes: [
      {
        id: "a",
        kind: "system",
        shape: "rectangle",
        title: "A",
        description: { txt: "about\nA" },
        children: ["a.b"],
        x: 0.4,
        y: 0,
        width: 5,
        height: 5,
      },
      {
        id: "a.b",
        parent: "a",
        kind: "container",
        shape: "queue",
        title: "B",
        technology: "Python",
        children: [],
        x: 1,
        y: 1,
        width: 2,
        height: 2,
      },
    ],
    edges: [
      {
        id: "step-02",
        source: "a.b",
        target: "a",
        label: "goes \nback",
        dir: "back",
        points: [
          [0.4, 1],
          [2, 2],
        ],
      },
    ],
  });
  assert.equal(v.dynamic, true);
  assert.equal(v.nodes[0].compound, true);
  assert.equal(v.nodes[0].description, "about A");
  assert.equal(v.nodes[1].compound, false);
  assert.deepEqual(v.edges[0], {
    id: "step-02",
    source: "a.b",
    target: "a",
    label: "goes back",
    points: [
      [0, 1],
      [2, 2],
    ],
    labelBBox: null,
    step: 2,
    back: true,
  });
});

test("wrap keeps lines inside the width and French quotes with their word", () => {
  assert.deepEqual(wrap("one two three four", 90, 10, 1), ["one two", "three", "four"]);
  for (const line of wrap("opens the PR, mirrors « Done when »", 150, 10, 1)) {
    assert.ok(!line.endsWith("«") && !line.startsWith("»"), line);
  }
});

test("pathOf turns LikeC4's Bézier points into an SVG path", () => {
  assert.equal(
    pathOf([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]),
    "M0,0 C1,1 2,2 3,3",
  );
  assert.equal(
    pathOf([
      [0, 0],
      [5, 5],
    ]),
    "M0,0 L5,5",
  );
  assert.equal(pathOf([[0, 0]]), "");
});

test("the drawing has every node's title, in the page's tokens, and escapes text", () => {
  for (const v of data.views.fr) {
    const svg = svgString(svgTree(v, PAGE_PALETTE));
    assert.match(svg, /^<svg viewBox="[^"]+" role="img" aria-label="/);
    assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(|hsl\(/i.test(svg), `${v.id}: no colour outside the tokens`);
    for (const n of v.nodes.filter((x) => !x.compound))
      assert.ok(svg.includes(n.title.split(" ")[0]), `${v.id}: ${n.title}`);
  }
  const view = { ...data.views.en[0], title: 'a <b> & "c"' };
  assert.match(svgString(svgTree(view, PAGE_PALETTE)), /aria-label="a &lt;b&gt; &amp; &quot;c&quot;"/);
});

test("an exported file stands alone, with each theme's colours read from the tokens", () => {
  const css = read("node_modules/@krizaka/tokens/dist/tokens.css");
  const light = paletteFromCss(css, ".theme-light");
  const dark = paletteFromCss(css, ":root, .theme-dark");
  assert.notEqual(light.paper, dark.paper);
  const svg = svgString(svgTree(data.views.en[0], light, { standalone: true }));
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<title>/);
  assert.ok(svg.includes(light.paper));
});

test("the text version says every element and every relation or step", () => {
  const v = data.views.en.find((x) => x.id === "pr_life");
  const words = textVersion(v);
  assert.equal(words.relations.length, v.edges.length);
  assert.equal(words.elements.length, v.nodes.filter((n) => !n.compound).length);
  assert.ok(words.relations[0].startsWith("Founder → GitHub: writes the ticket"));
});

test("the hashes are sha256 of the files", () => {
  assert.equal(data.source.sha256, sha256(read(MODEL)));
});
