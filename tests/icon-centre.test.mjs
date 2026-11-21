// Every icon sits centred on its text line, within 1 px (krizaka-internal#4001): the measure sees a shifted icon and passes a centred one.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { iconOffsets, iconProblems } from "../lib/icon-centre.mjs";

const page = (shift) =>
  `<style>a{display:inline-flex;align-items:center;gap:8px;font:16px/24px sans-serif}svg{position:relative;top:${shift}px}</style>
   <a href="#"><svg width="16" height="16"><rect width="16" height="16"/></svg>Lire en français</a>`;

const measure = async (shift) => {
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage();
    await p.setContent(page(shift));
    return iconProblems(await p.evaluate(iconOffsets));
  } finally {
    await browser.close();
  }
};

test("an icon shifted by 3 px is reported", async () => {
  const found = await measure(3);
  assert.equal(found.length, 1);
  assert.match(found[0], /px off its text line/);
});

test("a centred icon passes", async () => {
  assert.deepEqual(await measure(0), []);
});

test("check-layout measures the icons at 390 and 1440 px", () => {
  const src = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");
  assert.match(src, /const WIDTHS = \[[^\]]*1440[^\]]*390/);
  assert.match(src, /iconProblems\(await page\.evaluate\(iconOffsets\)\)/);
});
