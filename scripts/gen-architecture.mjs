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
/** Every model the posts draw, each laid out into its own file. `system`: the system the model may only extend (the org's home
    rule), or null for a model that declares systems of its own at the level of a post (the products and the libraries). */
export const MODELS = [
  { model: MODEL, translations: TRANSLATIONS, out: OUT, system: SYSTEM, views: VIEWS },
  {
    model: "content/diagrams/design-choices-for-architects.c4",
    translations: "content/diagrams/design-choices-for-architects.fr.json",
    out: "lib/architecture-design-choices.json",
    system: null,
    views: ["org_context", "org_containers"],
  },
];
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
export function staleProblems(data, sources, entry = MODELS[0]) {
  const out = [];
  if (data.source?.sha256 !== sha256(sources.model))
    out.push(`${entry.out}: made from another ${entry.model}; run gen-architecture.mjs --base …`);
  if (data.translations?.sha256 !== sha256(sources.translations))
    out.push(`${entry.out}: made from another ${entry.translations}; run gen-architecture.mjs --base …`);
  if (data.check?.status !== "ok") out.push(`${entry.out}: the model's check is ${data.check?.status ?? "absent"}`);
  for (const locale of ["en", "fr"])
    for (const id of entry.views)
      if (!data.views?.[locale]?.some((v) => v.id === id)) out.push(`${entry.out}: no view ${id} in ${locale}`);
  return out;
}

async function generate(argv) {
  const baseDir = resolve(flag(argv, "--base"));
  const base = BASE_FILES.map((name) => ({ path: name, text: readFileSync(join(baseDir, name), "utf8") }));
  for (const entry of MODELS) await generateOne(entry, base);
}

async function generateOne(entry, base) {
  const { model: MODEL, translations: TRANSLATIONS, out: OUT, system: SYSTEM, views: VIEWS } = entry;
  const model = read(MODEL);
  const translations = read(TRANSLATIONS);
  const layout = await layoutViews([{ path: MODEL, text: model }], { base, system: SYSTEM ?? undefined, views: VIEWS });
  console.log(
    `architecture check of ${MODEL} (@krizaka/architecture, system ${SYSTEM ?? "none"}): ${layout.check.status}`,
  );
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
  const problems = MODELS.flatMap((entry) =>
    staleProblems(
      JSON.parse(read(entry.out)),
      { model: read(entry.model), translations: read(entry.translations) },
      entry,
    ),
  );
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  for (const entry of MODELS)
    console.log(`gen-architecture: ${entry.out} matches ${entry.model} and ${entry.translations}`);
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
