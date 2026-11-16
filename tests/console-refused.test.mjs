import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, refused, reported } from "../scripts/console-refused.mjs";

const CORS =
  "Access to fetch at 'https://krizaka-assets.b-cdn.net/a.avif' from origin 'https://blog.krizaka.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present";
const UNUSED = "The resource https://x/a.avif was preloaded using link preload but not used within a few seconds";

test("a CORS refusal stays a red", () => {
  assert.ok(refused(CORS));
  const r = classify([CORS, "Download the React DevTools"]);
  assert.equal(r.reds.length, 1);
  assert.equal(r.warnings.length, 0);
});

test("an unused preload is a reported warning with its URL, never a red", () => {
  assert.equal(refused(UNUSED), false);
  assert.ok(reported(UNUSED));
  const r = classify([UNUSED, UNUSED]);
  assert.equal(r.reds.length, 0);
  assert.equal(r.warnings.length, 2);
  assert.deepEqual(r.urls, ["https://x/a.avif"]);
  assert.equal(classify(["Download the React DevTools"]).warnings.length, 0);
});
