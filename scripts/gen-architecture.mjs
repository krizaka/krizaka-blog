#!/usr/bin/env node
/* The architecture diagrams of a post, from a checked model (krizaka-internal#3643).

     node scripts/gen-architecture.mjs --tool <dir> [--tool-ref <sha>]   check the model with the org's architecture tool
                                                                        (krizaka/.github tools/architecture, `npm ci` done),
                                                                        lay it out, write lib/architecture.json
     node scripts/gen-architecture.mjs svg [--out <dir>]                 the standalone SVG of every view, per language and theme
                                                                        (default public/diagrams/, git-ignored; run by `npm run gen`)
     node scripts/gen-architecture.mjs check                             the layout was made from the model and the translations
                                                                        as they are now (no tool needed; also a test)

   The check is the org's own: its parser (LikeC4) with the org base (specification.c4, org.c4) and its home rule
   (`checkHome`: no specification, every element added lives inside one system, here the platform's « Agents tooling »).
   The French drawing is the same layout with every string translated by content/diagrams/<model>.fr.json; a string without
   its translation fails. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { paletteFromCss, svgString, svgTree } from "../lib/architecture.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MODEL = "content/diagrams/krizaka-agents.c4";
export const TRANSLATIONS = "content/diagrams/krizaka-agents.fr.json";
export const OUT = "lib/architecture.json";
export const SYSTEM = "platform.tooling";
export const VIEWS = ["agents_context", "agents_containers", "pr_life"];
export const THEMES = { light: ".theme-light", dark: ":root, .theme-dark" };

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const read = (path) => readFileSync(join(root, path), "utf8");
const flag = (argv, name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
/** LikeC4 breaks a long label with a newline for its own drawing; the page wraps words itself. */
const flat = (s) =>
  s == null
    ? null
    : String(s)
        .split("\n")
        .map((line) => line.trim())
        .join(" ");
const textOf = (d) => flat(typeof d === "string" ? d : (d?.txt ?? null));
/** Strings one per line, indented and quoted, for an error message. */
const listed = (strings) => strings.map((s) => "  " + JSON.stringify(s)).join("\n");
const stepOf = (id) => (/^step-(\d+)$/.exec(id) ? Number(/^step-(\d+)$/.exec(id)[1]) : null);

/** One laid-out LikeC4 view as the drawing needs it (lib/architecture.ts `ArchView`). */
export function viewOf(v) {
  return {
    id: v.id,
    title: v.title,
    dynamic: v._type === "dynamic",
    bounds: v.bounds,
    nodes: v.nodes.map((n) => ({
      id: n.id,
      parent: n.parent ?? null,
      kind: n.kind,
      shape: n.shape,
      title: flat(n.title),
      technology: flat(n.technology),
      description: textOf(n.description),
      compound: (n.children ?? []).length > 0,
      x: Math.round(n.x),
      y: Math.round(n.y),
      width: Math.round(n.width),
      height: Math.round(n.height),
    })),
    edges: v.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: flat(e.label),
      points: e.points.map(([x, y]) => [Math.round(x), Math.round(y)]),
      labelBBox: e.labelBBox ?? null,
      step: stepOf(e.id),
      back: e.dir === "back",
    })),
  };
}

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

async function orgCheck(tool, text) {
  const m = await import(pathToFileURL(join(tool, "lib/model.mjs")).href);
  const baseDir = join(tool, "..", "..", m.MODEL_DIR);
  const base = m.BASE_FILES.map((name) => ({
    repo: ".github",
    path: `${m.MODEL_DIR}${name}`,
    text: readFileSync(join(baseDir, name), "utf8"),
  }));
  const systems = { repo: ".github", path: `${m.MODEL_DIR}generated-systems.c4`, text: m.systemsDsl([]) };
  const known = new Set((await m.parse([...base, systems])).elements.map((e) => e.id));
  const home = { repo: "krizaka-blog", files: [{ path: MODEL, text, sha256: sha256(text) }] };
  const verdict = await m.checkHome({ base, systems, known, home, system: SYSTEM });
  const parsed = await m.parse([...base, systems, { repo: "krizaka-blog", path: MODEL, text }], { layout: true });
  return { verdict, views: parsed.views };
}

async function generate(argv) {
  const tool = resolve(flag(argv, "--tool"));
  const model = read(MODEL);
  const translations = read(TRANSLATIONS);
  const { verdict, views } = await orgCheck(tool, model);
  console.log(`architecture check (org tool, home rule, system ${SYSTEM}): ${verdict.status}`);
  for (const e of verdict.errors) console.log(`  ${e.repo}/${e.path}:${e.line} ${e.message}`);
  console.log(`  ${verdict.elements.length} elements added: ${verdict.elements.map((e) => e.id).join(", ")}`);
  if (verdict.status !== "ok") process.exit(1);
  const en = VIEWS.map((id) => views.find((v) => v.id === id) ?? null);
  const absent = VIEWS.filter((_, i) => en[i] === null);
  if (absent.length) throw new Error(`the model has no view ${absent.join(", ")}`);
  const drawn = en.map(viewOf);
  const missing = new Set();
  const fr = drawn.map((v) => translateView(v, JSON.parse(translations), missing));
  if (missing.size) {
    console.error(`${TRANSLATIONS}: no French for:\n${listed([...missing])}`);
    process.exit(1);
  }
  const unused = Object.keys(JSON.parse(translations)).filter((s) => !used(drawn).has(s));
  if (unused.length) {
    console.error(`${TRANSLATIONS}: translations no view uses:\n${listed(unused)}`);
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(join(tool, "package.json"), "utf8"));
  const data = {
    generatedBy: "scripts/gen-architecture.mjs",
    tool: {
      name: "krizaka/.github tools/architecture",
      ref: flag(argv, "--tool-ref"),
      likec4: pkg.dependencies["@likec4/language-services"],
    },
    source: { path: MODEL, sha256: sha256(model) },
    translations: { path: TRANSLATIONS, sha256: sha256(translations) },
    check: {
      status: verdict.status,
      system: SYSTEM,
      errors: verdict.errors,
      elements: verdict.elements.map((e) => e.id),
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

function exportSvg(argv) {
  const out = join(root, flag(argv, "--out") ?? "public/diagrams");
  const data = JSON.parse(read(OUT));
  const css = readFileSync(join(root, "node_modules/@krizaka/tokens/dist/tokens.css"), "utf8");
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const [theme, selector] of Object.entries(THEMES)) {
    const palette = paletteFromCss(css, selector);
    for (const [locale, views] of Object.entries(data.views))
      for (const v of views) {
        writeFileSync(
          join(out, `${v.id}.${locale}.${theme}.svg`),
          `${svgString(svgTree(v, palette, { standalone: true }))}\n`,
        );
        n += 1;
      }
  }
  const where = out.replace(root + "/", "");
  console.log(`gen-architecture: ${n} SVG files in ${where}`);
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
  if (argv[0] === "svg") exportSvg(argv);
  else if (argv[0] === "check") check();
  else if (flag(argv, "--tool")) await generate(argv);
  else {
    console.error("usage: gen-architecture.mjs --tool <dir> [--tool-ref <sha>] | svg [--out <dir>] | check");
    process.exit(2);
  }
}
