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
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../scripts/gen-favicon.mjs", import.meta.url), "utf8"),
  );
  const body = (s) =>
    s
      .slice(s.indexOf("function hslToCss"), s.indexOf("\n}\n", s.indexOf("function hslToCss")))
      .replace(/: (string|number)/g, "")
      .replace(/\s+/g, " ");
  assert.equal(
    body(src),
    body((await import("node:fs")).readFileSync(new URL("../lib/color.ts", import.meta.url), "utf8")),
  );
});

/* A post's card is its own cover, cropped to 1200×630: the widest file of the library (a clip's poster). */
test("the card's picture is the widest file of the cover, or a clip's poster", async () => {
  const { widestSource, OG_WIDTH, OG_HEIGHT } = await import("../lib/og-cover.ts");
  assert.equal(OG_WIDTH, 1200);
  assert.equal(OG_HEIGHT, 630);
  assert.equal(
    widestSource({
      kind: "image",
      srcs: [
        { w: 480, url: "a" },
        { w: 1536, url: "c" },
        { w: 960, url: "b" },
      ],
    }),
    "c",
  );
  assert.equal(widestSource({ kind: "video", poster: "p.jpg" }), "p.jpg");
});

test("both languages' routes hand the post's cover to the card", async () => {
  const fs = await import("node:fs");
  for (const f of ["../app/(en)/og/[slug]/route.tsx", "../app/fr/og/[slug]/route.tsx"]) {
    assert.match(fs.readFileSync(new URL(f, import.meta.url), "utf8"), /post\?\.cover\)/, f);
  }
});

test("the cover is placed from the card's padding edge (absolute children start inside the padding)", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../lib/og.tsx", import.meta.url), "utf8");
  assert.equal(
    (src.match(/top: -56,\s*left: -64/g) ?? []).length,
    2,
    "picture and veil are shifted by the card's 56/64 px padding",
  );
});

/* krizaka-internal#4502: chapter 39's card put white words on a light cover behind a 0.2 veil, under 2:1. The veil is measured.
   Every word over the picture is large text (54 px ExtraBold and up, the name 32 px Bold), so AA is 3:1. */
test("the veil brings white words to 3:1 (AA, large text) on the bright end of a light cover, and stays light on a dark one", async () => {
  const { veilFor, luminanceOf, VEIL_RGB, VEIL_MIN, LARGE_TEXT_CONTRAST } = await import("../lib/og-cover.ts");
  const contrast = (bg) => 1.05 / (bg + 0.05);
  const veiled = (l, a) => l * (1 - a) + luminanceOf(VEIL_RGB) * a;
  for (const l of [0.3, 0.5, 0.75, 0.9, 1]) {
    const a = veilFor(l);
    assert.equal(LARGE_TEXT_CONTRAST, 3);
    assert.ok(contrast(veiled(l, a)) >= 3, `luminance ${l}: veil ${a} gives ${contrast(veiled(l, a)).toFixed(2)}:1`);
    assert.ok(a < 0.75, `luminance ${l}: veil ${a} leaves the picture visible`);
  }
  assert.equal(veilFor(0.05), VEIL_MIN, "a dark cover keeps the light veil");
});

test("the bright end is the 90th percentile of the pixels' luminance", async () => {
  const { brightEnd, luminanceOf } = await import("../lib/og-cover.ts");
  const px = [];
  for (let i = 0; i < 9; i++) px.push(10, 10, 10);
  px.push(255, 255, 255);
  assert.equal(brightEnd(new Uint8Array(px), 3), 1);
  assert.equal(brightEnd(new Uint8Array(px.slice(0, 27)), 3), luminanceOf([10, 10, 10]));
  assert.equal(luminanceOf([255, 255, 255]), 1);
  assert.equal(luminanceOf([0, 0, 0]), 0);
});

test("the card draws the measured veil, not a fixed one", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../lib/og.tsx", import.meta.url), "utf8");
  assert.match(src, /veilGradient\(/);
  assert.match(src, /fontSize: 32,\s*fontWeight: 700/, "the blog's name stays large text");
  assert.match(src, /heading\.length > 90 \? 54/, "the smallest title stays large text");
  assert.doesNotMatch(src, /rgba\(8, 12, 20, 0\.2\)/);
});
