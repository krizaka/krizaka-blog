import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_STATE, LEVELS, c4Problems, nodesAt, zoomIn, zoomOut } from "../lib/c4-zoom.ts";

test("INITIAL_STATE is C1 with an empty path", () => {
  assert.equal(INITIAL_STATE.level, "c1");
  assert.deepEqual(INITIAL_STATE.path, []);
});

test("nodesAt(INITIAL_STATE) returns C1 nodes", () => {
  const nodes = nodesAt(INITIAL_STATE);
  assert.ok(nodes.length > 0, "C1 has at least one node");
  const floricel = nodes.find((n) => n.id === "floricel");
  assert.ok(floricel, "the fictional system node is present");
  assert.equal(floricel.zoomable, true, "the fictional system is zoomable");
});

test("zoomIn moves to the next level and records the selected node", () => {
  const s1 = zoomIn(INITIAL_STATE, "floricel");
  assert.equal(s1.level, "c2");
  assert.deepEqual(s1.path, ["floricel"]);
  const nodes = nodesAt(s1);
  assert.ok(nodes.length > 0, "C2 has nodes");
});

test("zoomOut goes back one level", () => {
  const s1 = zoomIn(INITIAL_STATE, "floricel");
  const s0 = zoomOut(s1);
  assert.equal(s0.level, "c1");
  assert.deepEqual(s0.path, []);
});

test("zoomOut on C1 stays at C1", () => {
  const s = zoomOut(INITIAL_STATE);
  assert.equal(s.level, "c1");
});

test("zoomIn on C4 stays at C4", () => {
  const s1 = zoomIn(INITIAL_STATE, "floricel");
  const s2 = zoomIn(s1, "api");
  const s3 = zoomIn(s2, "bookings");
  assert.equal(s3.level, "c4");
  const s4 = zoomIn(s3, "ctrl");
  assert.equal(s4.level, "c4", "cannot zoom past C4");
});

test("zooming into a zoomable path reaches C3 components", () => {
  const s1 = zoomIn(INITIAL_STATE, "floricel");
  const s2 = zoomIn(s1, "api");
  const s3 = zoomIn(s2, "bookings");
  const nodes = nodesAt(s3);
  assert.ok(nodes.length > 0, "C4 of bookings has code elements");
  assert.ok(
    nodes.every((n) => !n.zoomable),
    "C4 nodes are not zoomable",
  );
});

test("LEVELS has four entries in order", () => {
  assert.deepEqual(LEVELS, ["c1", "c2", "c3", "c4"]);
});

test("c4Problems returns empty on the current data", () => {
  assert.deepEqual(c4Problems(), []);
});
