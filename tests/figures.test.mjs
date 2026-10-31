import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { itemsOf, marksKey, marksOf, rowsOf, seriesOf, sideTone } from "../lib/figures.ts";
import { annotatedOf, overlaySvg } from "../scripts/annotate-figures.mjs";
import media from "../lib/media.json" with { type: "json" };

// The chapters' figures (krizaka-internal#716, founder 2026-10-30: « 2–3 figures in every chapter, framed with a caption »).
const dir = "content/chapters";
const body = (f) => readFileSync(`${dir}/${f}`, "utf8").split(/^---$/m).slice(2).join("---");
const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
const FIGURE = /<(Figure|Annotated|Clip|Pipeline|Split|Layers|Bars|IssueCurve|Plate)\b/g;
const figuresOf = (f) => [...body(f).matchAll(FIGURE)].map((m) => m[1]);
const tagsOf = (f, name) => [...body(f).matchAll(new RegExp(`<${name}\\b([^>]*?)/?>`, "g"))].map((m) => m[1]);
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

// The chapters done so far; a batch adds its chapters here, and the list ends as every chapter.
const DONE = [
  "what-claude-found-auditing-krizaka",
  "krizaka-ui-how-we-cut-it",
  "orazaka-v2-the-architecture-we-build",
  "we-bought-sonarcloud-what-do-we-have-now",
  "the-audit-said-ai-code-we-measured",
  "how-the-founder-and-the-cto-agent-work",
  "how-we-test-our-uis",
  "why-krizaka",
  "building-with-agents",
  "a-curve-that-climbs",
  "how-we-built-our-ci",
  "ci-the-error-never-leaves-the-editor",
  "tchou-tchou-how-our-pull-requests-catch-the-train",
  "how-our-automation-grew",
];

test("the figure props parse: items, tones, series and rows", () => {
  assert.deepEqual(itemsOf(" a | b |  | c "), ["a", "b", "c"]);
  assert.equal(sideTone("refuse"), "refuse");
  assert.equal(sideTone("nope"), "plain");
  const s = seriesOf("Green cells:success | Red cells:danger");
  assert.deepEqual(s, [
    { key: "s0", label: "Green cells", color: "success" },
    { key: "s1", label: "Red cells", color: "danger" },
  ]);
  assert.deepEqual(seriesOf("Thousand tokens per PR")[0].color, "accent");
  assert.deepEqual(rowsOf("First run=155,150; 28 October, evening=198,112", s), [
    { label: "First run", s0: 155, s1: 150 },
    { label: "28 October, evening", s0: 198, s1: 112 },
  ]);
  assert.throws(() => rowsOf("A=1", s), /needs 2 number/);
  assert.throws(() => rowsOf("A=x,1", s), /needs 2 number/);
  assert.throws(() => rowsOf("no value", s), /label=value/);
  assert.throws(() => seriesOf(""), /at least one series/);
});

for (const slug of DONE)
  for (const lang of ["en", "fr"])
    test(`${slug} (${lang}) carries at least two figures`, () => {
      assert.ok(figuresOf(`${slug}.${lang}.mdx`).length >= 2, figuresOf(`${slug}.${lang}.mdx`).join(", "));
    });

for (const f of files.filter((f) => f.endsWith(".en.mdx"))) {
  const fr = f.replace(".en.mdx", ".fr.mdx");
  test(`${f}: the French chapter draws the same figures, in the same order`, () => {
    assert.deepEqual(figuresOf(fr), figuresOf(f));
  });
}

for (const f of files) {
  test(`${f}: every drawn figure has a caption that says what it shows`, () => {
    for (const name of ["Pipeline", "Split", "Layers", "Bars", "Plate"])
      for (const t of tagsOf(f, name)) assert.ok((attr(t, "label") ?? "").length >= 25, `${name}${t}`);
    for (const t of tagsOf(f, "Side")) assert.ok(itemsOf(attr(t, "items")).length > 0, `Side${t}`);
    for (const t of tagsOf(f, "Layer")) assert.ok(attr(t, "title"), `Layer${t}`);
  });

  test(`${f}: every chart parses, with numbers the reader can check`, () => {
    for (const t of tagsOf(f, "Bars")) {
      const series = seriesOf(attr(t, "series") ?? "");
      const rows = rowsOf(attr(t, "data") ?? "", series);
      if (attr(t, "format") === "percent")
        for (const r of rows) for (const s of series) assert.ok(r[s.key] >= 0 && r[s.key] <= 100, t);
    }
  });

  test(`${f}: every image and clip has its alt text and is in the media library`, () => {
    for (const name of ["Figure", "Annotated", "Clip"])
      for (const t of tagsOf(f, name)) {
        assert.ok((attr(t, "alt") ?? "").length >= 20, `${name}${t}`);
        assert.ok(media[attr(t, "id")], `unknown media ${attr(t, "id")}`);
      }
  });
}

test("a code block's bar is not numbered as a figure (only the chapter's figures are)", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const rule = css.match(/([^{}]+)figcaption::before\s*\{[^}]*counter-increment: bl-fig/);
  assert.ok(rule, "the figure counter");
  assert.match(rule[1], /:not\(\.kz-code\)/);
});

test("the articles carry no icons: steps are numbered in mono, scopes and markers are plain text (founder 2026-10-31)", () => {
  const mdx = readFileSync("app/components/pages/mdx.tsx", "utf8");
  assert.doesNotMatch(mdx, /@krizaka\/icons|@krizaka\/ui\/stepper|LoaderGlyph/);
  for (const f of ["Pipeline", "Split", "Layers", "Bars", "Figure", "Clip", "IssueCurve"])
    assert.doesNotMatch(readFileSync(`app/components/pages/${f}.tsx`, "utf8"), /@krizaka\/icons/, f);
  assert.doesNotMatch(readFileSync("app/components/TakeStory.tsx", "utf8"), /bl-book/);
  const css = readFileSync("app/globals.css", "utf8");
  assert.doesNotMatch(css, /content:\s*"[✕✓✔✗]/u, "no glyph markers in the figures");
  assert.doesNotMatch(
    css,
    /\.bl-help\s*\{[^}]*border-radius:\s*50%/,
    "the « ? » is a plain text mark, not a drawn badge",
  );
});

// The annotated captures (founder 2026-10-31: « the reader doesn't know WHAT is tested »): numbered boxes drawn over a real screen,
// each one a thing the test asserts, told again in the legend; the picture and the legend can never drift apart.
test("an annotated capture's marks parse, numbered in order, inside the picture, each saying what is asserted", () => {
  const m = marksOf(
    "6,27.3,31,3.6: the price goes down to the total | 0.4,0.4,99.2,99.2: the whole screen against its reference",
  );
  assert.deepEqual(
    m.map((k) => [k.n, k.x, k.w]),
    [
      [1, 6, 31],
      [2, 0.4, 99.2],
    ],
  );
  assert.equal(marksKey(m), "6,27.3,31,3.6;0.4,0.4,99.2,99.2");
  assert.equal(marksOf("1,1,1,1: `minAction: 36`, at least 36 px")[0].label, "`minAction: 36`, at least 36 px");
  assert.throws(() => marksOf("90,1,20,1: runs out of the picture"), /inside the picture/);
  assert.throws(() => marksOf("1,1,1: three numbers only"), /four numbers/);
  assert.throws(() => marksOf("1,1,1,1: short"), /what the test asserts/);
  assert.throws(() => marksOf("no box at all"), /x,y,w,h: label/);
  assert.throws(() => marksOf(""), /1 to 6 marks/);
});

test("the drawing puts one box and one number per mark, the number off the content it frames", () => {
  const svg = overlaySvg(
    marksOf("10,10,20,20: a box with room on its left | 0,50,100,10: a full-width box"),
    1000,
    500,
  );
  assert.equal((svg.match(/<text\b/g) ?? []).length, 2);
  assert.match(svg, />1<\/text>/);
  assert.match(svg, />2<\/text>/);
  const tags = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="(\d+)" height="\d+" fill="#d23a2c"/g)].map(
    (t) => [+t[1], +t[3]],
  );
  assert.ok(tags[0][0] + tags[0][1] <= 100, "in the margin to the left of a box that has room");
  assert.ok(tags[1][0] + tags[1][1] <= 1000 && tags[1][0] > 900, "inside the top-right corner of a full-width box");
});

for (const f of files.filter((f) => f.endsWith(".en.mdx"))) {
  const fr = f.replace(".en.mdx", ".fr.mdx");
  const tags = (file) => annotatedOf(body(file));
  test(`${f}: every annotated capture is drawn with the boxes its legend numbers, the same in French`, () => {
    const en = tags(f);
    const other = tags(fr);
    assert.deepEqual(
      other.map((t) => t.id),
      en.map((t) => t.id),
    );
    en.forEach((t, i) => {
      const marks = marksOf(t.marks);
      assert.equal(
        marksKey(marksOf(other[i].marks)),
        marksKey(marks),
        `${t.id}: the French boxes are the English ones`,
      );
      assert.equal(
        media[t.id]?.marks,
        marksKey(marks),
        `${t.id}: redraw it (scripts/annotate-figures.mjs), the legend moved`,
      );
      assert.ok(media[t.id].made?.note, `${t.id}: says which test took the screen`);
    });
  });
}

test("the chapter on UI tests shows what its tests assert: three annotated captures, Yomizaka, Akinaza web and Android", () => {
  const ids = annotatedOf(body("how-we-test-our-uis.en.mdx")).map((t) => t.id);
  assert.deepEqual(ids, ["ui-test-akinaza-booking", "ui-test-yomizaka-report", "ui-test-maestro-books"]);
  assert.doesNotMatch(
    body("how-we-test-our-uis.en.mdx"),
    /id="maestro-(today|invoices|books)"/,
    "no bare screenshot left",
  );
});
