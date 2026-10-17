import test from "node:test";
import assert from "node:assert/strict";
import { hslToCss } from "../lib/color.ts";

/* The Open Graph image draws with the tokens' values: hsl() turned into colours the image renderer reads. */
test("hsl() of the tokens becomes #rrggbb, and rgba() with an alpha", () => {
  assert.equal(hslToCss("hsl(0 0% 100%)"), "#ffffff");
  assert.equal(hslToCss("hsl(0 0% 0%)"), "#000000");
  assert.equal(hslToCss("hsl(217 92% 53%)"), "#196df5");
  assert.equal(hslToCss("hsl(0 0% 100% / 0.16)"), "rgba(255, 255, 255, 0.16)");
});

test("the mark's generator and the image use the same conversion", async () => {
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../scripts/gen-favicon.mjs", import.meta.url), "utf8"));
  const body = (s) => s.slice(s.indexOf("function hslToCss"), s.indexOf("\n}\n", s.indexOf("function hslToCss"))).replace(/: (string|number)/g, "").replace(/\s+/g, " ");
  assert.equal(body(src), body((await import("node:fs")).readFileSync(new URL("../lib/color.ts", import.meta.url), "utf8")));
});
