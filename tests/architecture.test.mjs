import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArchitectureDiagram } from "@krizaka/ui/architecture-diagram";
import {
  MODEL,
  OUT,
  TRANSLATIONS,
  VIEWS,
  sha256,
  staleProblems,
  translateView,
  used,
} from "../scripts/gen-architecture.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const data = JSON.parse(read(OUT));
const sources = () => ({ model: read(MODEL), translations: read(TRANSLATIONS) });

test("the layout was made from the model and the translations as they are now, and the org's check said ok", () => {
  assert.deepEqual(staleProblems(data, sources()), []);
  assert.equal(data.check.status, "ok");
  assert.equal(data.check.system, "platform.tooling");
  assert.ok(
    data.check.elements.every((id) => id.startsWith("platform.tooling.")),
    "every element added lives in the tooling",
  );
});

test("a model changed after its layout is stale", () => {
  const s = sources();
  const problems = staleProblems(data, { ...s, model: `${s.model}\n// edited` });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /made from another content\/diagrams\/krizaka-agents\.c4/);
});

test("a layout whose check is not ok, or that lacks a view, is refused", () => {
  const s = sources();
  assert.ok(staleProblems({ ...data, check: { status: "invalid" } }, s).some((p) => p.includes("invalid")));
  const views = { en: data.views.en.filter((v) => v.id !== "pr_life"), fr: data.views.fr };
  assert.ok(staleProblems({ ...data, views }, s).some((p) => p.includes("no view pr_life in en")));
});

test("every view is there in both languages, and the French one is fully translated with no unused entry", () => {
  const map = JSON.parse(read(TRANSLATIONS));
  for (const id of VIEWS) {
    const en = data.views.en.find((v) => v.id === id);
    const fr = data.views.fr.find((v) => v.id === id);
    assert.ok(en && fr, id);
    assert.deepEqual(
      fr.nodes.map((n) => [n.id, n.x, n.y]),
      en.nodes.map((n) => [n.id, n.x, n.y]),
      "one layout, two languages",
    );
    const missing = new Set();
    assert.deepEqual(translateView(en, map, missing), fr);
    assert.equal(missing.size, 0);
  }
  const all = used(data.views.en);
  assert.deepEqual(
    Object.keys(map).filter((k) => !all.has(k)),
    [],
  );
});

test("the dynamic view numbers its steps in the model's order", () => {
  const v = data.views.en.find((x) => x.id === "pr_life");
  assert.equal(v.dynamic, true);
  assert.deepEqual(
    v.edges.map((e) => e.step),
    v.edges.map((_, i) => i + 1),
  );
});

test("the shared component draws every view, in both languages, with each element's title and the words", () => {
  for (const locale of ["en", "fr"])
    for (const v of data.views[locale]) {
      const html = renderToStaticMarkup(createElement(ArchitectureDiagram, { view: v }));
      assert.ok(html.includes("<svg"), v.id);
      for (const n of v.nodes)
        assert.ok(html.includes(n.title.split(" ")[0].replace(/&/g, "&amp;")), `${locale} ${v.id}: ${n.title}`);
    }
});

test("the hashes are sha256 of the files", () => {
  assert.equal(data.source.sha256, sha256(read(MODEL)));
});
