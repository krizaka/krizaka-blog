import test from "node:test";
import assert from "node:assert/strict";
import { kindOf, labelOf, outDirOf, usedImages } from "../scripts/media-contact-sheet.mjs";

test("the contact sheet lists every cover and every inline picture of the posts, in chapter order", () => {
  const rows = usedImages();
  assert.ok(rows.filter((r) => r.role === "cover").length >= 24, "a cover per chapter");
  assert.ok(rows.some((r) => r.id === "chapter-23-chouf" && r.role === "inline"));
  const orders = rows.map((r) => r.order);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
  );
  for (const r of rows) assert.equal(r.entry.kind, "image");
});

test("a diagram, a screen capture or a model comparison is judged by nature, a generated still by its look", () => {
  assert.equal(kindOf({ kind: "image", style: "diagram" }), "by-nature");
  assert.equal(kindOf({ kind: "image", made: { model: "Screen capture (no model)" } }), "by-nature");
  assert.equal(kindOf({ kind: "image", made: { model: "Stable Diffusion 1.5" } }), "by-nature");
  assert.equal(kindOf({ kind: "image", made: { model: "GPT Image 2.5 Sunburst" } }), "generated");
});

test("the output folder is a plain name under the temporary folder, never a path", () => {
  assert.match(outDirOf("pr-300"), /media-contact-sheet[\\/]pr-300$/);
  for (const bad of ["../x", "/etc", "a/b", ".hidden", "", undefined]) assert.equal(outDirOf(bad), null);
});

test("a tile label names the chapter or the post, escapes SVG and flags a picture judged by nature", () => {
  assert.equal(labelOf({ order: 3, id: "a&b", entry: { kind: "image" } }), "ch03 a&amp;b");
  assert.equal(labelOf({ order: 100, id: "x", entry: { kind: "image", style: "diagram" } }), "post x · by nature");
});
