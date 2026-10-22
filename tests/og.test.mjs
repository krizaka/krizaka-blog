import test from "node:test";
import assert from "node:assert/strict";
import { hslToCss } from "../lib/color.ts";

/* The Open Graph image draws with the tokens' values: hsl() turned into colours the image renderer reads. */
test("hsl() of the tokens becomes #rrggbb, and rgba() with an alpha", () => {
  assert.equal(hslToCss("hsl(0 0% 100%)"), "#ffffff");
  assert.equal(hslToCss("hsl(0 0% 0%)"), "#000000");
  assert.equal(hslToCss("hsl(208 46% 45%)"), "#3e76a8");
  assert.equal(hslToCss("hsl(0 0% 100% / 0.16)"), "rgba(255, 255, 255, 0.16)");
});

test("the mark's generator and the image use the same conversion", async () => {
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../scripts/gen-favicon.mjs", import.meta.url), "utf8"));
  const body = (s) => s.slice(s.indexOf("function hslToCss"), s.indexOf("\n}\n", s.indexOf("function hslToCss"))).replace(/: (string|number)/g, "").replace(/\s+/g, " ");
  assert.equal(body(src), body((await import("node:fs")).readFileSync(new URL("../lib/color.ts", import.meta.url), "utf8")));
});

/* A post's card is its own cover, cropped to 1200×630: the widest file of the library (a clip's poster). */
test("the card's picture is the widest file of the cover, or a clip's poster", async () => {
  const { widestSource, OG_WIDTH, OG_HEIGHT } = await import("../lib/og-cover.ts");
  assert.equal(OG_WIDTH, 1200);
  assert.equal(OG_HEIGHT, 630);
  assert.equal(widestSource({ kind: "image", srcs: [{ w: 480, url: "a" }, { w: 1536, url: "c" }, { w: 960, url: "b" }] }), "c");
  assert.equal(widestSource({ kind: "video", poster: "p.jpg" }), "p.jpg");
});

test("both languages' routes hand the post's cover to the card", async () => {
  const fs = await import("node:fs");
  for (const f of ["../app/(en)/og/[slug]/route.tsx", "../app/fr/og/[slug]/route.tsx"]) {
    assert.match(fs.readFileSync(new URL(f, import.meta.url), "utf8"), /post\?\.cover\)/, f);
  }
});
