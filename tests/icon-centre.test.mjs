// The check-layout guard measures every icon at 390 and 1440 px (krizaka-internal#4001); the browser proof is tests/browser/icon-centre.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("check-layout measures the icons at 390 and 1440 px", () => {
  const src = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");
  assert.match(src, /const WIDTHS = \[[^\]]*1440[^\]]*390/);
  assert.match(src, /iconProblems\(await page\.evaluate\(iconOffsets\)\)/);
});
