import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentParity,
  englishProblems,
  linksOf,
  numbersOf,
  parityProblems,
  timesOf,
} from "../scripts/content-parity.mjs";

const doc = (front, body) => `---\n${front}\n---\n\n${body}\n`;
const FRONT = 'title: "t"\ndate: 2026-11-01\npublishedAt: "2026-11-01T10:00:00-04:00"\ndraft: false\ntags: [ai]';

test("the same skeleton in both languages passes", () => {
  const fr = doc(
    FRONT,
    '## Le coût\n\nUn H100 coûte 3,99 $ l\'heure, 1 234 appels, à 15 h 55.\n\n<Figure id="a" alt="x" />\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[le site](/fr/story/x/#le-cout)',
  );
  const en = doc(
    FRONT,
    '## The cost\n\nAn H100 costs $3.99 an hour, 1,234 calls, at 3:55 pm.\n\n<Figure id="a" alt="x" />\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[the site](/story/x/#the-cost)',
  );
  assert.deepEqual(parityProblems(fr, en), []);
});

test("a missing heading, figure, table, link or number is named", () => {
  const fr = doc(
    FRONT,
    '## Un\n\n## Deux\n\n<Clip id="c" alt="x" />\n\nIl y avait 25 titres.\n\n| a |\n|---|\n| 1 |\n\n[x](repo:a/pull/1)',
  );
  const en = doc(FRONT, "## One\n\nThere were 24 headings.");
  assert.deepEqual(parityProblems(fr, en), [
    "h2: fr 2 ≠ en 1",
    "tables: fr 1 ≠ en 0",
    "<Clip>: fr 1 ≠ en 0",
    "link repo:a/pull/1: fr 1 ≠ en 0",
    "number 24: in en, not in fr",
    "number 1: in fr, not in en",
    "number 25: in fr, not in en",
  ]);
});

test("front-matter facts must agree; titles are free", () => {
  const fr = doc('title: "Un"\ndate: 2026-11-01\nchapter: 3', "x");
  const en = doc('title: "One"\ndate: 2026-11-02\nchapter: 3', "x");
  assert.deepEqual(parityProblems(fr, en), [
    'front matter date: fr "2026-11-01T00:00:00.000Z" ≠ en "2026-11-02T00:00:00.000Z"',
  ]);
});

test("numbers are read the way each language writes them", () => {
  assert.deepEqual([...numbersOf("1 440 passages, 0,033, Wan 2.2, Qwen3 235B", "fr")], ["1440", "0.033", "2.2", "235"]);
  assert.deepEqual([...numbersOf("1,440 runs, 0.033, Wan 2.2, Qwen3 235B", "en")], ["1440", "0.033", "2.2", "235"]);
  assert.deepEqual([...numbersOf('<Bars data="a=0,22; b=4,19" />', "fr")], ["0", "22", "4", "19"]);
  assert.equal(timesOf("à 0 h 45, puis 18 h", "fr"), "à 0:45, puis 18");
  assert.deepEqual([...numbersOf("from 19:00 to 7:00 pm", "en")], ["19"]);
  assert.deepEqual([...numbersOf("de 19 h à 19 h 00", "fr")], ["19"]);
  assert.deepEqual([...numbersOf("1 367 heures sur 1 487, cent", "fr")], ["1367", "1487"]);
  assert.equal(timesOf("at 12:45 am, then 6 p.m.", "en"), "at 0:45, then 18");
  assert.equal(timesOf("à 19 h 10, puis 19\u00a0h\u00a010", "fr"), "à 19:10, puis 19:10");
  assert.deepEqual([...numbersOf("à 19 h 10", "fr")], [...numbersOf("at 7:10 pm", "en")]);
});

test("code is not prose: numbers and components inside a fence are ignored", () => {
  const fr = doc(FRONT, "```js\nconst a = <Figure x={1} />; // 42\n```\n\nRien.");
  const en = doc(FRONT, "Nothing.");
  assert.deepEqual(parityProblems(fr, en), []);
});

test("links compare without their language segment and their heading fragment", () => {
  assert.deepEqual(linksOf("[a](/fr/story/x/#un) [b](site:www/fr) [c](#annexe)"), ["/story/x/", "site:www/", "#"]);
  assert.deepEqual(linksOf("[a](/story/x/#one) [b](site:www/en) [c](#appendix)"), ["/story/x/", "site:www/", "#"]);
});

test("English is written as English: “ ” quotes and the dollar sign first", () => {
  assert.deepEqual(englishProblems("It costs $3.99, “nothing to do”, RTX 4090 $0.89/h."), []);
  assert.deepEqual(englishProblems("It said « nothing to do » for 34,42 $ and 5.29 $/h."), [
    "en: 1 French quote(s) « » — English quotes are “ ”",
    "en: amount(s) written the French way (34,42 $, 5.29 $) — write $12.50",
  ]);
});

test("the allowlist only shrinks: a fixed gap still listed fails, an unknown pair fails", () => {
  const root = mkdtempSync(join(tmpdir(), "parity-"));
  for (const dir of ["content/chapters", "content/posts"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "content/chapters/a.fr.mdx"), doc(FRONT, "## Un\n\n## Deux"));
  writeFileSync(join(root, "content/chapters/a.en.mdx"), doc(FRONT, "## One"));
  writeFileSync(join(root, "content/chapters/b.fr.mdx"), doc(FRONT, "x"));
  writeFileSync(join(root, "content/chapters/b.en.mdx"), doc(FRONT, "x"));
  assert.deepEqual(contentParity(root, {}).problems, ["content/chapters/a: h2: fr 2 ≠ en 1"]);
  assert.deepEqual(contentParity(root, { allowed: { "content/chapters/a": ["h2: fr 2 ≠ en 1"] } }).problems, []);
  assert.deepEqual(contentParity(root, { excluded: { "content/chapters/a": "in flight" } }).problems, []);
  assert.deepEqual(
    contentParity(root, {
      allowed: { "content/chapters/a": ["h2: fr 2 ≠ en 1"], "content/chapters/b": ["h3: fr 1 ≠ en 0"] },
    }).problems,
    ["content/chapters/b: « h3: fr 1 ≠ en 0 » is fixed — remove it from content-parity-allow.json"],
  );
  assert.deepEqual(
    contentParity(root, { excluded: { "content/chapters/a": "in flight", "content/chapters/z": "gone" } }).problems,
    ["content/chapters/z: no such FR/EN pair — remove it from content-parity-allow.json"],
  );
});
