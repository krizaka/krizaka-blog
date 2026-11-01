// « Read offline » (founder, 2026-11-01): « This chapter » and « The whole story » are ONE control, the quiet underlined link of the
// EPUB · PDF row. A bug means a missing guard: the two scopes drifted (a bordered secondary button next to a link).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("../app/components/SaveOffline.tsx", import.meta.url), "utf8");
const body = (name) => src.slice(src.indexOf(`export function ${name}`)).split(/\nexport /)[0];

test("SaveChapter and SaveSeries render the same OfflineButton, with no variant or class of their own", () => {
  for (const name of ["SaveChapter", "SaveSeries"]) {
    const b = body(name);
    const tag = /<OfflineButton\b[^>]*>/s.exec(b)?.[0];
    assert.ok(tag, name);
    assert.doesNotMatch(b, /<Button\b/, name);
    assert.doesNotMatch(tag, /variant=|className=|shape=|size=/, `${name} must not style its own button`);
  }
});

test("OfflineButton is the quiet link: ghost, small, bl-offline-quiet, keyboard ring kept (no outline reset)", () => {
  const b = src.slice(src.indexOf("function OfflineButton"), src.indexOf("export function SaveChapter"));
  assert.match(b, /variant="ghost"/);
  assert.match(b, /size="sm"/);
  assert.match(b, /className="bl-offline-quiet"/);
  assert.doesNotMatch(b, /outline/);
});
