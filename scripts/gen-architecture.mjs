#!/usr/bin/env node
/* The architecture diagrams of a post, from a checked model (krizaka-internal#3643).

     node scripts/gen-architecture.mjs --base <dir>   check the model with `layoutViews` of @krizaka/architecture against the org's base
                                                     (<dir> = krizaka/.github docs/architecture: specification.c4, org.c4),
                                                     lay it out, write lib/architecture.json
     node scripts/gen-architecture.mjs check          the layout was made from the model and the translations as they are now
                                                     (no base needed; also a test)

   The check and the layout are the package's (LikeC4 parser, the org's home rule: no specification, every element added lives
   inside one system, here « Agents tooling »); the drawing is @krizaka/ui's `ArchitectureDiagram`. The French drawing is the same
   layout with every string translated by content/diagrams/<model>.fr.json; a string without its translation fails. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { layoutViews } from "@krizaka/architecture";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MODEL = "content/diagrams/krizaka-agents.c4";
export const TRANSLATIONS = "content/diagrams/krizaka-agents.fr.json";
export const OUT = "lib/architecture.json";
export const SYSTEM = "platform.tooling";
export const VIEWS = ["agents_context", "agents_containers", "pr_life", "alert_life", "opsdb_sync"];
export const BASE_FILES = ["specification.c4", "org.c4"];

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const read = (path) => readFileSync(join(root, path), "utf8");
const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
/** Strings one per line, indented and quoted, for an error message. */
const listed = (strings) => strings.map((s) => "  " + JSON.stringify(s)).join("\n");

/** The view with every string translated; `missing` collects the strings the map lacks. */
export function translateView(view, map, missing) {
  const t = (s) => {
    if (s === null) return null;
    if (!(s in map)) missing.add(s);
    return map[s] ?? s;
  };
  return {
    ...view,
    title: t(view.title),
    nodes: view.nodes.map((n) => ({
      ...n,
      title: t(n.title),
      technology: t(n.technology),
      description: t(n.description),
    })),
    edges: view.edges.map((e) => ({ ...e, label: t(e.label) })),
  };
}

/** Every string a view draws or says (the keys a translation needs). */
export function used(views) {
  const out = new Set();
  for (const v of views) {
    out.add(v.title);
    for (const n of v.nodes) for (const s of [n.title, n.technology, n.description]) if (s !== null) out.add(s);
    for (const e of v.edges) if (e.label !== null) out.add(e.label);
  }
  return out;
}

/** What `check` reports: the layout is stale when a source changed after it was made. */
export function staleProblems(data, sources) {
  const out = [];
  if (data.source?.sha256 !== sha256(sources.model))
    out.push(`${OUT}: made from another ${MODEL}; run gen-architecture.mjs --tool …`);
  if (data.translations?.sha256 !== sha256(sources.translations))
    out.push(`${OUT}: made from another ${TRANSLATIONS}; run gen-architecture.mjs --tool …`);
  if (data.check?.status !== "ok") out.push(`${OUT}: the model's check is ${data.check?.status ?? "absent"}`);
  for (const locale of ["en", "fr"])
    for (const id of VIEWS)
      if (!data.views?.[locale]?.some((v) => v.id === id)) out.push(`${OUT}: no view ${id} in ${locale}`);
  return out;
}

async function generate(argv) {
  const baseDir = resolve(flag(argv, "--base"));
  const model = read(MODEL);
  const translations = read(TRANSLATIONS);
  const base = BASE_FILES.map((name) => ({ path: name, text: readFileSync(join(baseDir, name), "utf8") }));
  const layout = await layoutViews([{ path: MODEL, text: model }], { base, system: SYSTEM, views: VIEWS });
  console.log(`architecture check (@krizaka/architecture, home rule, system ${SYSTEM}): ${layout.check.status}`);
  console.log(`  ${layout.check.elements.length} elements added: ${layout.check.elements.join(", ")}`);
  const drawn = layout.views;
  const map = JSON.parse(translations);
  const missing = new Set();
  const fr = drawn.map((v) => translateView(v, map, missing));
  if (missing.size) {
    console.error(`${TRANSLATIONS}: no French for:\n${listed([...missing])}`);
    process.exit(1);
  }
  const unused = Object.keys(map).filter((s) => !used(drawn).has(s));
  if (unused.length) {
    console.error(`${TRANSLATIONS}: translations no view uses:\n${listed(unused)}`);
    process.exit(1);
  }
  const data = {
    generatedBy: "scripts/gen-architecture.mjs",
    tool: layout.tool,
    source: { path: MODEL, sha256: sha256(model) },
    base: layout.sources.base,
    translations: { path: TRANSLATIONS, sha256: sha256(translations) },
    check: {
      status: layout.check.status,
      system: SYSTEM,
      errors: layout.check.errors,
      elements: layout.check.elements,
    },
    views: { en: drawn, fr },
  };
  const prettier = await import("prettier");
  const options = (await prettier.resolveConfig(join(root, OUT))) ?? {};
  writeFileSync(
    join(root, OUT),
    await prettier.format(JSON.stringify(data), { ...options, filepath: join(root, OUT) }),
  );
  for (const v of drawn)
    console.log(
      `  view ${v.id}: ${v.nodes.length} nodes, ${v.edges.length} edges, ${v.bounds.width}×${v.bounds.height}`,
    );
  console.log(`wrote ${OUT}`);
}

function check() {
  const problems = staleProblems(JSON.parse(read(OUT)), { model: read(MODEL), translations: read(TRANSLATIONS) });
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`gen-architecture: ${OUT} matches ${MODEL} and ${TRANSLATIONS}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv[0] === "check") check();
  else if (flag(argv, "--base")) await generate(argv);
  else {
    console.error("usage: gen-architecture.mjs --base <krizaka/.github docs/architecture> | check");
    process.exit(2);
  }
}
