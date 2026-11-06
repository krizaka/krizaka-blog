import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const series = JSON.parse(readFileSync("content/image-series/series.json", "utf8"));
const posts = readdirSync("content/chapters")
  .filter((f) => f.endsWith(".en.mdx"))
  .map((f) => f.replace(".en.mdx", ""));
const BIRDS = ["falcon", "owl", "duck", "flamingo", "pigeon"];

test("every chapter has exactly one chapter, and only they", () => {
  const slugs = series.chapters.map((c) => c.post);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.ok(posts.includes(s), `${s} is not a post`);
  for (const p of posts) assert.ok(slugs.includes(p), `${p} has no chapter`);
});

test("seeds are unique, so no picture is ever reused", () => {
  const seeds = series.chapters.map((c) => c.seed);
  assert.equal(new Set(seeds).size, seeds.length);
});

test("the cast only grows: birds arrive one by one and stay", () => {
  let previous = [];
  for (const c of series.chapters) {
    assert.ok(c.birds.every((b) => BIRDS.includes(b)));
    assert.ok(
      previous.every((b) => c.birds.includes(b)),
      `${c.post} lost a bird`,
    );
    assert.ok(c.birds.length - previous.length <= 1, `${c.post} brings two birds at once`);
    previous = c.birds;
  }
});

test("legal guardrails: the prompts name no person, brand, character or lyric", () => {
  const text = [series.style, series.continuity, ...series.chapters.map((c) => c.beat)].join(" ").toLowerCase();
  for (const word of series.never) {
    if (["real person", "athlete", "celebrity", "logo", "lyrics"].includes(word)) continue; // said as « no … » in the style
    assert.ok(!text.includes(word), `the prompts name « ${word} »`);
  }
  assert.match(series.style, /No people, no text, no lettering, no logos/);
  for (const b of BIRDS)
    assert.ok(
      !series.style.includes(b),
      "the style names no bird: a reference-based model draws every bird it is told of",
    );
});

test("the renderer runs mflux through the worker's own python, never the entry point's shebang (stale when the venv moved)", async () => {
  const { execFileSync } = await import("node:child_process");
  const py = [
    "import importlib.util, json, pathlib, sys",
    "spec = importlib.util.spec_from_file_location('ris', 'scripts/render-image-series.py')",
    "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
    "s = json.load(open('content/image-series/series.json'))",
    "sp = {b: pathlib.Path('/s/' + b) for b in s['sprites']}",
    "print(json.dumps(m.command(s, 0, sp, None, pathlib.Path('/o.png'), pathlib.Path('/w'))[:2]))",
  ].join("\n");
  const head = JSON.parse(execFileSync("python3", ["-c", py], { encoding: "utf8" }));
  assert.deepEqual(head, ["/w/.venv/bin/python", "/w/.venv/bin/mflux-generate-flux2-edit"]);
});

/* One look for the whole series (krizaka-internal#2455): the covers and the pictures drawn for a chapter are hand-drawn ink and
   watercolor on paper in the Krizaka palette. Chapters 23 and 24 were once a flat vector night scene, then a cartoon, and broke the
   series. A generated still that is not in that look must be listed with its reason in content/image-series/flagged.json (what the
   founder decides, what is a demonstration); scripts/media-contact-sheet.mjs draws every picture side by side for a human. */
import { usedImages, kindOf } from "../scripts/media-contact-sheet.mjs";

const WATERCOLOR = /hand-drawn ink and watercolor/i;
const media = JSON.parse(readFileSync("lib/media.json", "utf8"));
const flagged = JSON.parse(readFileSync("content/image-series/flagged.json", "utf8")).images;
const FLAGGED = new Set(flagged.map((f) => f.id));
/* What the provenance says of the look: the old entries say it in their prompt or engine, the redrawn ones in their note. */
const said = (entry) => [entry.made?.prompt, entry.made?.engine, entry.made?.note].filter(Boolean).join(" ");
const saidBy = (entry) => [entry.made?.engine, entry.made?.note].filter(Boolean).join(" ");

test("every generated still of the posts is in the series' look, or listed with its reason", () => {
  for (const row of usedImages()) {
    if (kindOf(row.entry) !== "generated" || FLAGGED.has(row.id)) continue;
    assert.match(
      said(row.entry),
      WATERCOLOR,
      `${row.id} (${row.slug}) is neither ink and watercolor nor in flagged.json`,
    );
    assert.doesNotMatch(saidBy(row.entry), /flat vector/i, `${row.id} breaks the series' look`);
  }
});

test("flagged.json lists only pictures the posts show, each with a reason and a decision", () => {
  const used = new Set(usedImages().map((r) => r.id));
  for (const f of flagged) {
    assert.ok(used.has(f.id), `${f.id} is not shown by a post: remove it from flagged.json`);
    assert.ok(f.why.length > 20, `${f.id}: say why`);
    assert.ok(f.decision === "demonstration", `${f.id}: decision`);
    assert.ok(!WATERCOLOR.test(said(media[f.id])), `${f.id} is in the series' look: take it off flagged.json`);
  }
});

test("every cover of the series has the same picture ratio (16:9) and its renditions", () => {
  for (const [id, entry] of Object.entries(media).filter(([k]) => k.startsWith("series-"))) {
    assert.ok(
      Math.abs(entry.width / entry.height - 16 / 9) < 0.02,
      `${id}: ${entry.width}×${entry.height} is not 16:9`,
    );
    assert.ok(entry.renditions?.avif && entry.renditions?.webp, `${id}: no renditions`);
  }
});

test("the redrawn pictures carry their Runway provenance: prompt, references, takes", () => {
  const runway = JSON.parse(readFileSync("content/image-series/runway.json", "utf8"));
  assert.equal(runway.model, "gpt_image_2_5_sunburst");
  assert.deepEqual(Object.keys(runway.images).sort(), [
    "chapter-23-chouf",
    "chapter-23-firefighter",
    "series-22-how-orazaka-made-our-brand-film",
    "series-23-the-trains-second-version-rails-sidings-and-a-repair-train",
    "series-24-how-we-stay-in-sync",
    "workshop-table",
  ]);
  for (const [id, spec] of Object.entries(runway.images)) {
    assert.match(spec.prompt, /hand-drawn[\s\S]*watercolor/i, `${id}: the prompt asks for a hand-drawn watercolor`);
    assert.match(spec.prompt, /Not a cartoon|Absolutely not a cartoon/i, `${id}: the prompt refuses the cartoon look`);
    assert.equal(media[id].made.model, "GPT Image 2.5 Sunburst", `${id}: provenance`);
    assert.equal(media[id].made.prompt, spec.prompt, `${id}: the entry carries the prompt`);
  }
});

test("lib/media.json names no cover or chapter picture outside the series' look (a redraw that never reached main slipped once)", () => {
  for (const [id, entry] of Object.entries(media)) {
    if (!/^(series|chapter)-/.test(id) || FLAGGED.has(id)) continue;
    assert.match(said(entry), WATERCOLOR, `${id} is in media.json but neither ink and watercolor nor in flagged.json`);
  }
});
