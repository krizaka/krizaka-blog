import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// krizaka-internal#3912: a figure whose caption says « Mac » must stand on a real capture of the Mac app: its media entry says so in
// `made.note` (the app, the CI run, the journey step) and names the script that makes the capture again in `made.script`.
const POST = "five-ergonomics-choices-on-our-real-screens";
export const CAPTURE_SCRIPT = "scripts/desktop-journey.mjs";
const MEDIA = JSON.parse(readFileSync(new URL("../lib/media.json", import.meta.url), "utf8"));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

export function macFigureProblems(file, source, media) {
  const problems = [];
  for (const m of source.matchAll(/<Figure\b([^>]*?)\/?>/g)) {
    const id = attr(m[1], "id");
    if (!/\bMac\b/.test(attr(m[1], "caption") ?? "")) continue;
    const made = media[id]?.made;
    if (!made) {
      problems.push(`${file}: figure ${id} says « Mac » but has no media entry with a provenance`);
      continue;
    }
    if (!/capture of the Mac app/.test(made.note ?? ""))
      problems.push(`${file}: figure ${id} says « Mac » but its note is not a « capture of the Mac app »`);
    if (!/CI run \d+/.test(made.note ?? "")) problems.push(`${file}: figure ${id}: its note names no CI run`);
    if (made.script !== CAPTURE_SCRIPT)
      problems.push(`${file}: figure ${id}: made.script is not ${CAPTURE_SCRIPT}, the capture could not be made again`);
  }
  return problems;
}

test("the guard refuses a Mac caption on a figure with no Mac capture note", () => {
  const src = `<Figure id="x" alt="a" caption="Verikora, web · Mac." />`;
  assert.equal(macFigureProblems("p.mdx", src, { x: { made: { note: "A screenshot of dev." } } }).length, 3);
  assert.equal(macFigureProblems("p.mdx", src, {}).length, 1);
  const ok = {
    x: { made: { note: "A capture of the Mac app 0.1, CI run 123, step 5.", script: CAPTURE_SCRIPT } },
  };
  assert.deepEqual(macFigureProblems("p.mdx", src, ok), []);
  assert.deepEqual(macFigureProblems("p.mdx", `<Figure id="y" alt="a" caption="Web only." />`, {}), []);
});

for (const locale of ["en", "fr"]) {
  const file = `content/posts/${POST}.${locale}.mdx`;
  test(`${file}: every figure that says Mac stands on a Mac capture`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.deepEqual(macFigureProblems(file, source, MEDIA), []);
  });
  test(`${file}: the Mac is claimed only where a capture exists`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const macFigures = [...source.matchAll(/<Figure\b([^>]*?)\/?>/g)].filter((m) =>
      /\bMac\b/.test(attr(m[1], "caption") ?? ""),
    );
    assert.ok(macFigures.length >= 1, "at least one figure shows web · Mac");
  });
}
