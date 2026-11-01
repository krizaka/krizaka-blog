import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalogueValues, findCodeNames } from "@krizaka/org";

// Commercial names (2026-11-01, krizaka-internal#2103): the blog's own words say Verikora, Folioviv, Sovkora. The old chapters
// keep their historical names (history is not rewritten); the built site is reported by scripts/ci-after-build.sh.
for (const lang of ["en", "fr"]) {
  test(`${lang}: no code name in the messages, the tags and the series say the commercial names`, () => {
    const m = JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));
    assert.deepEqual(
      catalogueValues(m).flatMap(([, t]) => findCodeNames(t)),
      [],
    );
    assert.equal(m.tags.names.orazaka, "Sovkora");
    assert.equal(m.tags.names.yomizaka, "Verikora");
    assert.match(m.series.names["building-orazaka"], /Sovkora/);
  });
}
