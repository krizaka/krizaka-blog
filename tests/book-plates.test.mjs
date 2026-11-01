// The covers' mark and flock (founder, 2026-11-01): the official @krizaka/ui drawings, rendered as line art — one ink, no gradient,
// no shade — by a build step (lib/line-art.mjs, lib/plates.mjs), never copied into the repository.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { INK, PAPER } from "../lib/ebook-style.mjs";
import { FLOCK, lineArt } from "../lib/line-art.mjs";
import { renderPlates } from "../lib/plates.mjs";

const colours = (svg) => [...svg.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]);

test("lineArt keeps the paths, drops shade and gradients, and paints with ink and paper only", () => {
  const svg =
    '<svg width="96" height="96" viewBox="0 0 120 120" fill="none"><style>.a{}</style><defs><linearGradient id="g"></linearGradient></defs>' +
    '<ellipse cx="60" cy="110" rx="24" ry="3.5" fill="#000000" opacity="0.14"></ellipse>' +
    '<path d="M1 1 L2 2" fill="url(#g)" stroke="var(--kz-border-strong, red)" stroke-width="1.4"></path>' +
    '<path d="M1 1 L2 2" fill="#000000" opacity="0.16"></path>' +
    '<circle cx="5" cy="5" r="4" fill="#000000"></circle></svg>';
  const out = lineArt(svg, { ink: "#111", paper: "#eee", size: 200 });
  assert.ok(!/<style|<defs|<ellipse|gradient|url\(|opacity|var\(/.test(out), out);
  assert.equal((out.match(/<path/g) ?? []).length, 1);
  assert.match(out, /width="200" height="200"/);
  assert.deepEqual([...new Set(colours(out).filter((c) => c !== "none"))].sort(), ["#111", "#eee"]);
});

test("every cover plate is the official drawing in line art: ink and paper, no gradient, the six birds and the mark", async () => {
  const plates = await renderPlates({ ink: INK, paper: PAPER });
  assert.deepEqual(
    plates.birds.map((b) => b.bird),
    FLOCK,
  );
  assert.deepEqual(FLOCK, ["owl", "duck", "beaver", "falcon", "pigeon", "flamingo"]);
  for (const svg of [plates.mark, ...plates.birds.map((b) => b.svg)]) {
    assert.ok(/<(path|circle)/.test(svg));
    assert.ok(!/gradient|url\(#|opacity|<style|var\(--/.test(svg), svg.slice(0, 200));
    for (const c of colours(svg)) assert.ok([INK, PAPER, "none"].includes(c), `colour ${c}`);
  }
});

test("nothing of the flock is copied into the repository: the plates are rendered at build", () => {
  const files = [...readdirSync(new URL("../public", import.meta.url), { recursive: true })].map(String);
  assert.ok(!files.some((f) => /(owl|duck|beaver|falcon|pigeon|flamingo|krizaka-mark)\.svg$/.test(f)));
  assert.ok(existsSync(new URL("../lib/plates.mjs", import.meta.url)));
  assert.match(readFileSync(new URL("../lib/plates.mjs", import.meta.url), "utf8"), /@krizaka\/ui/);
});
