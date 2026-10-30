import test from "node:test";
import assert from "node:assert/strict";

import { languageSwitchPath } from "../lib/locale.ts";

// 2026-10-23: switching language on a post sent the reader to the home page. It now keeps the same post when it is translated.
test("the language switch keeps the reader on the same post when it exists in the other language", () => {
  assert.equal(
    languageSwitchPath("fr", "/posts/orazaka-engine-v2", ["orazaka-engine-v2"]),
    "/fr/posts/orazaka-engine-v2/",
  );
  assert.equal(
    languageSwitchPath("en", "/posts/orazaka-engine-v2/", ["orazaka-engine-v2"]),
    "/posts/orazaka-engine-v2/",
  );
});

test("a post without a translation lands on the other language's home, never on a 404", () => {
  assert.equal(languageSwitchPath("fr", "/posts/english-only", []), "/fr/");
});

test("every other page keeps its path", () => {
  assert.equal(languageSwitchPath("fr", "/", []), "/fr/");
  assert.equal(languageSwitchPath("en", "/tags/orazaka", []), "/tags/orazaka/");
  assert.equal(languageSwitchPath("fr", "/search", []), "/fr/search/");
});
