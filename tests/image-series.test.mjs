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
