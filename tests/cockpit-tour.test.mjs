import test from "node:test";
import assert from "node:assert/strict";
import { GROUPS, GROUP_IDS, SCREENS, SCREEN_IDS, MOCK_DATA, tourProblems } from "../lib/cockpit-tour.ts";

test("every SCREEN_ID appears in SCREENS exactly once", () => {
  for (const id of SCREEN_IDS) {
    const found = SCREENS.filter((s) => s.id === id);
    assert.equal(found.length, 1, `screen "${id}" must appear in SCREENS exactly once`);
  }
  assert.equal(SCREENS.length, SCREEN_IDS.length, "SCREENS and SCREEN_IDS have the same count");
});

test("every screen is in a known group", () => {
  for (const s of SCREENS) {
    assert.ok(GROUP_IDS.includes(s.group), `screen "${s.id}" has unknown group "${s.group}"`);
  }
});

test("every group has at least one screen", () => {
  for (const g of GROUPS) {
    assert.ok(g.screens.length > 0, `group "${g.id}" has no screens`);
  }
  assert.equal(GROUPS.length, GROUP_IDS.length, "GROUPS covers every GROUP_ID");
});

test("every screen has mock data with 2–3 rows", () => {
  for (const id of SCREEN_IDS) {
    const rows = MOCK_DATA[id];
    assert.ok(rows, `screen "${id}" has no mock data`);
    assert.ok(rows.length >= 2 && rows.length <= 3, `screen "${id}": mock must have 2–3 rows, got ${rows.length}`);
    for (const row of rows) {
      assert.ok(row.label?.trim(), `screen "${id}": mock row has no label`);
      assert.ok(row.value !== undefined && row.value !== null, `screen "${id}": mock row has no value`);
    }
  }
});

test("tourProblems returns empty on the current data", () => {
  assert.deepEqual(tourProblems(), []);
});
