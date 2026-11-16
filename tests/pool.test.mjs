import test from "node:test";
import assert from "node:assert/strict";
import { mapPool } from "../lib/pool.mjs";

test("results keep the order of the items, whatever finishes first", async () => {
  const items = [30, 1, 20, 2, 10];
  const out = await mapPool(items, 3, async (ms, i) => {
    await new Promise((r) => setTimeout(r, ms));
    return `${i}:${ms}`;
  });
  assert.deepEqual(out, ["0:30", "1:1", "2:20", "3:2", "4:10"]);
});

test("never more than `limit` tasks at once, and all of them run", async () => {
  let live = 0,
    peak = 0,
    ran = 0;
  await mapPool(
    Array.from({ length: 20 }, (_, i) => i),
    4,
    async () => {
      peak = Math.max(peak, ++live);
      await new Promise((r) => setTimeout(r, 2));
      live--;
      ran++;
    },
  );
  assert.equal(ran, 20);
  assert.equal(peak, 4);
});

test("progress is reported per finished task, and a failure rejects", async () => {
  const seen = [];
  await mapPool(
    [1, 2, 3],
    2,
    async (x) => x,
    (n) => seen.push(n),
  );
  assert.deepEqual(seen, [1, 2, 3]);
  await assert.rejects(
    mapPool([1, 2, 3], 2, async (x) => {
      if (x === 2) throw new Error("boom");
      return x;
    }),
    /boom/,
  );
});

test("check-layout uses the pool and keeps --concurrency", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../scripts/check-layout.mjs", import.meta.url), "utf8");
  assert.match(src, /mapPool\(paths, concurrency, checkPath/);
  assert.match(src, /--concurrency/);
});
