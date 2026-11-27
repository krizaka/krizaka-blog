import test from "node:test";
import assert from "node:assert/strict";

test("readStore reads, caches, updates, notifies subscribers, and tolerates storage errors", async () => {
  const backing = new Map();
  const original = globalThis.localStorage;
  let throwOnSet = false;
  globalThis.localStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => {
      if (throwOnSet) throw new Error("quota");
      backing.set(k, String(v));
    },
  };
  try {
    backing.set("kz-basics-read", JSON.stringify(["intro", 42]));
    const { readStore } = await import(`../lib/read-store.ts?t=${Date.now()}`);
    assert.deepEqual(readStore.getServerSnapshot(), []);

    const snap1 = readStore.getSnapshot();
    assert.deepEqual(snap1, ["intro"]);
    assert.strictEqual(readStore.getSnapshot(), snap1, "subsequent reads return the cached snapshot");

    let notified = 0;
    const unsubscribe = readStore.subscribe(() => {
      notified++;
    });
    readStore.mark("intro");
    assert.equal(notified, 0, "marking an already-read slug does not notify");

    readStore.mark("second");
    assert.equal(notified, 1);
    assert.deepEqual(readStore.getSnapshot(), ["intro", "second"]);
    assert.deepEqual(JSON.parse(backing.get("kz-basics-read")), ["intro", "second"]);

    throwOnSet = true;
    readStore.mark("third");
    assert.equal(notified, 2);
    assert.deepEqual(readStore.getSnapshot(), ["intro", "second", "third"]);

    unsubscribe();
    readStore.mark("fourth");
    assert.equal(notified, 2, "unsubscribed listeners are not called");
  } finally {
    globalThis.localStorage = original;
  }
});
