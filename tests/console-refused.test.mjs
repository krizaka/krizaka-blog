import { test } from "node:test";
import assert from "node:assert/strict";
import { refused } from "../scripts/console-refused.mjs";

test("the console check refuses a CORS block and an unused preload, nothing else", () => {
  assert.ok(
    refused(
      "Access to fetch at 'https://krizaka-assets.b-cdn.net/a.avif' from origin 'https://blog.krizaka.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present",
    ),
  );
  assert.ok(
    refused("The resource https://x/a.avif was preloaded using link preload but not used within a few seconds"),
  );
  assert.equal(refused("Download the React DevTools"), false);
});
