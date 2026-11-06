import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WIDTHS, webSources } from "../scripts/series-web-files.mjs";

/* A stand-in for sharp: the "webp" of a width is the text `w<width>`, so the files and their hashes can be read back. */
const fakeSharp = () => ({
  resize: ({ width }) => ({ webp: () => ({ toBuffer: async () => Buffer.from(`w${width}`) }) }),
});

test("a series picture gets one web file per width, and the CDN URL carries the hash of that file", async () => {
  const out = mkdtempSync(join(tmpdir(), "series-web-"));
  mkdirSync(join(out, "series"));
  const srcs = await webSources(fakeSharp, "in.png", out, "series-01-x");
  assert.deepEqual(
    srcs.map((s) => s.w),
    WIDTHS,
  );
  for (const s of srcs) {
    assert.equal(readFileSync(join(out, "series", `series-01-x-${s.w}.webp`), "utf8"), `w${s.w}`);
    assert.match(s.url, new RegExp(`series/series-01-x-${s.w}\\.[0-9a-f]{10}\\.webp$`));
  }
  assert.equal(new Set(srcs.map((s) => s.url)).size, WIDTHS.length);
});
