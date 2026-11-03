import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { railState, railsLayout, railsProblems, wagonsOf } from "../lib/rails.ts";

// The train figures (Rails, krizaka-internal#2256): wagons parse, never overlap, fit the wide and the phone drawing, and every
// <Rails> of a chapter fits both — a crowded figure fails here instead of drawing a wrong picture.
const WIDE = { width: 640, narrow: false };
const NARROW = { width: 300, narrow: true };

test("a rail's wagons parse head first, with a known state", () => {
  assert.deepEqual(wagonsOf(" PR 1:go | fix(main):fix |  "), [
    { label: "PR 1", state: "go" },
    { label: "fix(main)", state: "fix" },
  ]);
  assert.throws(() => wagonsOf("PR 1"), /label:state/);
  assert.throws(() => wagonsOf("PR 1:green"), /label:state/);
  assert.throws(() => wagonsOf(""), /at least one wagon/);
  assert.equal(railState(undefined), "open");
  assert.equal(railState("frozen"), "frozen");
  assert.throws(() => railState("closed"), /open or frozen/);
});

test("waiting wagons stand left of the station, arrived ones right of it, red ones on the siding", () => {
  for (const o of [WIDE, NARROW]) {
    const { rails } = railsLayout(
      [{ name: "Product A", wagons: "PR 3:go | PR 4:wait | PR 2:red | PR 1:done" }],
      "main",
      o,
    );
    const r = rails[0];
    const by = (l) => r.wagons.find((w) => w.label === l);
    assert.ok(by("PR 3").x + by("PR 3").w <= r.stationX, "the head is left of the station");
    assert.ok(by("PR 4").x < by("PR 3").x, "the next waits behind the head");
    assert.ok(by("PR 1").x > r.stationX, "the arrived wagon is past the station");
    assert.ok(r.siding, "a red wagon opens a siding");
    assert.ok(by("PR 2").y > by("PR 3").y, "the red wagon is below the track");
    assert.deepEqual(railsProblems(railsLayout([{ name: "Product A", wagons: "PR 1:go" }], "main", o), o), []);
  }
});

test("a crowded rail is reported, not drawn", () => {
  const many = Array.from({ length: 9 }, (_, i) => `a long wagon ${i}:wait`).join(" | ");
  const layout = railsLayout([{ name: "Product A", wagons: many }], "main", NARROW);
  assert.ok(railsProblems(layout, NARROW).some((p) => /off its track/.test(p)));
  const long = railsLayout([{ name: "A name far too long for its column", wagons: "PR 1:go" }], "main", WIDE);
  assert.ok(railsProblems(long, WIDE).some((p) => /too long/.test(p)));
});

const dir = "content/chapters";
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
  const body = readFileSync(`${dir}/${f}`, "utf8");
  for (const [i, fig] of [...body.matchAll(/<Rails\b([^>]*)>([\s\S]*?)<\/Rails>/g)].entries())
    test(`${f}: train figure ${i + 1} fits the wide and the phone drawing, with its text version`, () => {
      assert.ok((attr(fig[1], "label") ?? "").length >= 25, "a caption that says what it shows");
      const rails = [...fig[2].matchAll(/<Rail\b([^>]*)\/>/g)].map((m) => ({
        name: attr(m[1], "name"),
        state: attr(m[1], "state"),
        station: attr(m[1], "station"),
        wagons: attr(m[1], "wagons") ?? "",
      }));
      assert.ok(rails.length > 0);
      for (const o of [WIDE, NARROW]) assert.deepEqual(railsProblems(railsLayout(rails, "main", o), o), []);
      assert.ok([...fig[2].matchAll(/<Beat>[^<]{20,}<\/Beat>/g)].length >= 2, "at least two beats in order");
    });
}

test("every rail of a figure stops at the same station post, so the rails read as one yard", () => {
  for (const o of [WIDE, NARROW]) {
    const { rails } = railsLayout(
      [
        { name: "Product A", wagons: "PR 2:go | PR 1:done" },
        { name: "Product B", wagons: "PR 1:go" },
        { name: "Watchdog", station: "alert", wagons: "watchdog:free" },
      ],
      "main",
      o,
    );
    assert.equal(new Set(rails.map((r) => r.stationX)).size, 1);
  }
});
