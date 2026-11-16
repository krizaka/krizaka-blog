import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as glyphs from "@krizaka/icons/glyphs";
import { SKETCHES, drawingProblems, legendFor, legendProblems, numbersOf, sketchOf, specsOf } from "../lib/sketches.ts";

/* The chapters' pen drawings (krizaka-internal#3943): typed specs in content/sketches/, words in the chapter, the block
   that draws them in @krizaka/ui (krizaka-internal#4006). */
const root = new URL("..", import.meta.url).pathname;
const chapters = readdirSync(`${root}content/chapters`).filter((f) => f.endsWith(".mdx"));
const sketchesOf = (file) =>
  [
    ...readFileSync(`${root}content/chapters/${file}`, "utf8").matchAll(
      /<Sketch id="([^"]+)"[^>]*>([\s\S]*?)<\/Sketch>/g,
    ),
  ].map(([, id, body]) => ({
    id,
    legend: [...body.matchAll(/<Callout n="(\d+)" label="([^"]+)">([^<]+)<\/Callout>/g)].map(([, n, label, text]) => ({
      n: Number(n),
      label,
      text: text.trim(),
    })),
  }));
const used = chapters.flatMap((file) => sketchesOf(file).map((s) => ({ ...s, file })));

test("every drawing is valid: numbers 1 to n in reading order, shapes and callouts inside, no words inside", () => {
  for (const [id, entry] of Object.entries(SKETCHES)) assert.deepEqual(drawingProblems(id, entry), [], id);
});

test("every icon of a drawing is an @krizaka/icons glyph", () => {
  for (const [id, entry] of Object.entries(SKETCHES))
    for (const spec of specsOf(entry))
      for (const shape of spec.shapes)
        if (shape.kind === "icon") assert.ok(shape.name in glyphs, `${id}: unknown icon « ${shape.name} »`);
});

test("an unknown id is refused", () => {
  assert.throws(() => sketchOf("no-such-sketch"), /unknown id « no-such-sketch »/);
  assert.throws(() => sketchOf("toString"), /unknown id/);
});

test("every <Sketch> of a chapter names a drawing, and every number has one legend line and the reverse", () => {
  assert.ok(used.length > 0);
  for (const { id, legend, file } of used) {
    assert.deepEqual(
      legendProblems(
        id,
        sketchOf(id),
        legend.map((l) => l.n),
      ),
      [],
      file,
    );
    assert.deepEqual(
      legend.map((l) => l.n),
      numbersOf(sketchOf(id)),
      `${file}: ${id}'s legend follows the numbers`,
    );
    for (const l of legend)
      assert.ok(l.label && l.text, `${file}: ${id} line ${l.n} says what it is and what it is for`);
  }
});

test("both languages draw the same sketches with the same numbers, and no drawing is left unused", () => {
  for (const fr of chapters.filter((f) => f.endsWith(".fr.mdx"))) {
    const en = fr.replace(".fr.mdx", ".en.mdx");
    const shape = (file) => sketchesOf(file).map((s) => `${s.id}:${s.legend.map((l) => l.n).join(",")}`);
    assert.deepEqual(shape(fr), shape(en), fr);
  }
  const ids = new Set(used.map((s) => s.id));
  for (const id of Object.keys(SKETCHES)) assert.ok(ids.has(id), `${id} is drawn by no chapter`);
});

test("the legend check catches a missing line, a line without a number and a number given twice", () => {
  const entry = sketchOf("ergo-error");
  assert.deepEqual(legendProblems("x", entry, [1, 2, 3, 4, 5]), []);
  assert.match(legendProblems("x", entry, [1, 2, 3, 4]).join(), /callout 5 has no legend line/);
  assert.match(legendProblems("x", entry, [1, 2, 3, 4, 5, 6]).join(), /legend line 6 has no callout/);
  assert.match(legendProblems("x", entry, [1, 2, 3, 4, 5, 5]).join(), /given twice/);
});

test("the drawing check catches a shape outside, a repeated number and words inside the drawing", () => {
  const spec = (shapes, callouts) => ({ spec: { width: 100, height: 100, shapes, callouts } });
  const box = { kind: "box", x: 10, y: 10, w: 20, h: 20 };
  assert.deepEqual(drawingProblems("x", spec([box], [{ n: 1, at: [10, 10] }])), []);
  assert.match(drawingProblems("x", spec([{ ...box, w: 200 }], [{ n: 1, at: [10, 10] }])).join(), /shape 1 leaves it/);
  assert.match(
    drawingProblems(
      "x",
      spec(
        [box],
        [
          { n: 1, at: [10, 10] },
          { n: 1, at: [20, 20] },
        ],
      ),
    ).join(),
    /each once/,
  );
  assert.match(
    drawingProblems("x", spec([{ kind: "text", x: 1, y: 1, text: "Hi" }], [{ n: 1, at: [5, 5] }])).join(),
    /no words/,
  );
  assert.match(drawingProblems("x", spec([box], [{ n: 1, at: [10, 10], from: [-5, 10] }])).join(), /callout 1 leaves/);
});

test("a pair's legend is split by side: each drawing gets the lines of its own numbers", () => {
  const entry = sketchOf("ergo-studios");
  assert.ok("before" in entry);
  const legend = [1, 2, 3, 4].map((n) => ({ n, label: `L${n}`, text: "t" }));
  assert.deepEqual(
    legendFor(entry.before, legend).map((l) => l.n),
    [1],
  );
  assert.deepEqual(
    legendFor(entry.after, legend).map((l) => l.n),
    [2, 3, 4],
  );
});

test("each side of every drawing passes @krizaka/ui's own legend check", async () => {
  const ui = await import("@krizaka/ui/sketch");
  for (const { id, legend } of used)
    for (const spec of specsOf(sketchOf(id)))
      assert.deepEqual(ui.sketchProblems(spec, legendFor(spec, legend)), [], id);
});

test("chapter 34 shows no real capture and no clip: every screen is a sketch", () => {
  for (const locale of ["fr", "en"]) {
    const mdx = readFileSync(
      `${root}content/chapters/five-ergonomics-choices-on-our-real-screens.${locale}.mdx`,
      "utf8",
    );
    assert.doesNotMatch(mdx, /<Figure\b|<Clip\b|<Row\b/, locale);
    assert.ok(sketchesOf(`five-ergonomics-choices-on-our-real-screens.${locale}.mdx`).length >= 5, locale);
  }
});

/* Chapter 35, the cockpit's ergonomics (krizaka-internal#4000): no capture and no clip, one drawing per view in the order of a
   day (Today first, the folded Workshop last), the refresh gesture as a before / after pair, and the post stays `sensitive`. */
test("chapter 35 draws the cockpit's views in the order of a day, with no capture, no clip and no amount", () => {
  const order = [
    "cockpit-today",
    "cockpit-refresh",
    "cockpit-machine",
    "cockpit-alerts",
    "cockpit-ships",
    "cockpit-costs",
  ];
  for (const locale of ["fr", "en"]) {
    const file = `one-local-cockpit-to-run-the-whole-company.${locale}.mdx`;
    const mdx = readFileSync(`${root}content/chapters/${file}`, "utf8");
    assert.doesNotMatch(mdx, /<Figure\b|<Clip\b|<Row\b|cockpit-(?:equipes|alertes|rafraichir)/, locale);
    assert.match(mdx, /^sensitive: true$/m, locale);
    const ids = sketchesOf(file).map((s) => s.id);
    assert.deepEqual(
      ids.filter((id) => order.includes(id)),
      order,
      locale,
    );
    assert.equal(ids.at(-1), "cockpit-secrets", locale);
    assert.ok("before" in sketchOf("cockpit-refresh"), "the refresh gesture is a before / after pair");
  }
});
