// scripts/check-vitals.mjs (krizaka-blog#210): the Core Web Vitals budget, its verdict and the pages it measures; CI runs it in a browser.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BUDGET, pagesToMeasure, vitalsProblems } from "../scripts/check-vitals.mjs";

test("the budget is Google's « good » thresholds at most", () => {
  assert.ok(BUDGET.lcpMs <= 2500, "LCP good is 2.5 s");
  assert.ok(BUDGET.cls <= 0.1, "CLS good is 0.1");
});

test("a page within the budget has no problem; each metric over it is named", () => {
  assert.deepEqual(vitalsProblems("/", { lcp: 1200, cls: 0.01 }), []);
  assert.match(vitalsProblems("/", { lcp: 3000, cls: 0 }).join(), /LCP 3000 ms is over/);
  assert.match(vitalsProblems("/fr/", { lcp: 900, cls: 0.4 }).join(), /\/fr\/: CLS 0\.400 is over/);
  assert.equal(vitalsProblems("/", { lcp: 3000, cls: 0.4 }).length, 2);
});

test("a page that reports no LCP fails: a blind check is not a pass", () => {
  assert.match(vitalsProblems("/", { lcp: 0, cls: 0 }).join(), /no Largest Contentful Paint/);
});

test("the pages measured are the home in both languages, then a post and a chapter of each", () => {
  assert.deepEqual(pagesToMeasure(), ["/", "/fr/"]);
  const out = mkdtempSync(join(tmpdir(), "vitals-"));
  for (const dir of ["basics/a", "story/b", "fr/basics/c", "fr/story/d"]) {
    mkdirSync(join(out, dir), { recursive: true });
    writeFileSync(join(out, dir, "index.html"), "");
  }
  assert.deepEqual(pagesToMeasure(out), ["/", "/fr/", "/basics/a/", "/story/b/", "/fr/basics/c/", "/fr/story/d/"]);
});

test("CI runs the check after the layout check, in the same browser install", () => {
  const sh = readFileSync(new URL("../scripts/ci-after-build.sh", import.meta.url), "utf8");
  const layout = sh.indexOf("check-layout.mjs");
  const vitals = sh.indexOf("check-vitals.mjs --base http://localhost:3000 --posts out");
  assert.ok(layout > 0 && vitals > layout);
});
