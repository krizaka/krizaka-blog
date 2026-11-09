import { test } from "node:test";
import assert from "node:assert/strict";
import { BEATS, REASONS, TRAIN_SCRIPT, trainFrames, trainProblems } from "../lib/train-sim.ts";

test("the shipped scenario is sound", () => {
  assert.deepEqual(trainProblems(), []);
});

test("every frame's beat is a known beat, and the reason a known reason", () => {
  for (const f of trainFrames()) {
    assert.ok(BEATS.includes(f.beat), `unknown beat ${f.beat}`);
    if (f.reason) assert.ok(REASONS.includes(f.reason), `unknown reason ${f.reason}`);
  }
});

test("a car is never in two lanes, and lane indices run 0..n", () => {
  for (const f of trainFrames()) {
    const ids = f.cars.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, "a car appears twice in a frame");
    for (const lane of ["queue", "merged", "siding"]) {
      const idx = f.cars
        .filter((c) => c.lane === lane)
        .map((c) => c.index)
        .sort((a, b) => a - b);
      idx.forEach((n, i) => assert.equal(n, i, `lane ${lane} index gap`));
    }
  }
});

test("the red car reaches the siding with a reason and never merges", () => {
  const end = trainFrames().at(-1).cars;
  const red = end.find((c) => c.lane === "siding");
  assert.ok(red, "no car on the siding");
  assert.equal(red.check, "red");
  assert.ok(red.reason, "a sidelined car needs a reason");
  assert.ok(!end.some((c) => c.lane === "merged" && c.check !== "green"), "a non-green car merged");
});

test("the head advances: PR 1 merges before PR 3, and PR 2 is the one set aside", () => {
  const end = trainFrames().at(-1).cars;
  const byLabel = Object.fromEntries(end.map((c) => [c.label, c]));
  assert.equal(byLabel["PR 1"].lane, "merged");
  assert.equal(byLabel["PR 2"].lane, "siding");
  assert.equal(byLabel["PR 3"].lane, "merged");
  assert.ok(byLabel["PR 1"].index < byLabel["PR 3"].index, "PR 1 merged before PR 3");
});

test("merging a car that is not the green head is refused", () => {
  assert.throws(
    () =>
      trainFrames([
        { kind: "enter", id: "a", label: "PR 1" },
        { kind: "merge", id: "a" },
      ]),
    /only a green car merges/,
  );
});

test("setting aside a car that is not red is refused", () => {
  assert.throws(
    () =>
      trainFrames([
        { kind: "enter", id: "a", label: "PR 1" },
        { kind: "run", id: "a" },
        { kind: "check", id: "a", result: "green" },
        { kind: "sideline", id: "a", reason: "flaky" },
      ]),
    /only a red car is set aside/,
  );
});

test("trainProblems reports a scenario that never sets a car aside", () => {
  const problems = trainProblems([
    { kind: "enter", id: "a", label: "PR 1" },
    { kind: "run", id: "a" },
    { kind: "check", id: "a", result: "green" },
    { kind: "merge", id: "a" },
  ]);
  assert.ok(problems.includes("the scenario never sets a red car aside"));
});

test("a car cannot merge from behind the head", () => {
  assert.throws(
    () =>
      trainFrames([
        { kind: "enter", id: "a", label: "PR 1" },
        { kind: "enter", id: "b", label: "PR 2" },
        { kind: "run", id: "b" },
        { kind: "check", id: "b", result: "green" },
        { kind: "merge", id: "b" },
      ]),
    /only the head of the queue merges/,
  );
});
