import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { jsonLd } from "../lib/json-ld.ts";

test("a closing script tag in a value cannot leave the JSON-LD block", () => {
  const out = jsonLd({ headline: "</script><img src=x onerror=alert(1)>", note: "a & b" });
  assert.ok(!out.includes("<") && !out.includes(">") && !out.includes("&"));
  assert.deepEqual(JSON.parse(out), { headline: "</script><img src=x onerror=alert(1)>", note: "a & b" });
});

test("line separators are escaped and the value round-trips", () => {
  const value = { a: "x y z" };
  const out = jsonLd(value);
  assert.ok(!out.includes(" ") && !out.includes(" "));
  assert.deepEqual(JSON.parse(out), value);
});

test("no page injects a raw JSON.stringify into a script", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(name)) files.push(p);
    }
  };
  walk(new URL("../app", import.meta.url).pathname);
  const bad = files.filter((f) => /__html:\s*JSON\.stringify/.test(readFileSync(f, "utf8")));
  assert.deepEqual(bad, []);
});

import { seriesNode } from "../lib/series.ts";

test("the story's series node is the same on every chapter of a language and names Krizaka as publisher", () => {
  const series = { name: "The Krizaka story", url: "https://blog.krizaka.com/" };
  const node = seriesNode("en", series, "https://www.krizaka.com/#organization");
  assert.equal(node["@type"], "CreativeWorkSeries");
  assert.equal(node["@id"], "https://blog.krizaka.com/#series-en");
  assert.notEqual(node["@id"], seriesNode("fr", series, "x")["@id"]);
  assert.deepEqual(node.publisher, { "@id": "https://www.krizaka.com/#organization" });
});

test("only a chapter page passes a series and a position to the article", () => {
  const seo = readFileSync(new URL("../lib/seo.ts", import.meta.url), "utf8");
  assert.match(seo, /position: series\.position/);
  assert.match(
    readFileSync(new URL("../app/components/pages/ChapterPage.tsx", import.meta.url), "utf8"),
    /position: chapter\.chapter/,
  );
  assert.doesNotMatch(
    readFileSync(new URL("../app/components/pages/PostPage.tsx", import.meta.url), "utf8"),
    /position:/,
  );
});
