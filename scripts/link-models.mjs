#!/usr/bin/env node
/* The codemod of the model-link rule (lib/models.ts): wraps the first unlinked mention of each known model in a post with
   <Model id="…">…</Model>. `node scripts/link-models.mjs` previews, `--write` changes the files of content/posts. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_BY_ID, mentionsOf } from "../lib/models.ts";

/** The body with the first unlinked mention of each model wrapped (a family already linked through one of its models is left). */
export function linkModels(body) {
  const seen = new Set();
  const groups = new Set();
  const wrap = [];
  for (const x of mentionsOf(body)) {
    const m = MODEL_BY_ID.get(x.id);
    if (!seen.has(x.id)) {
      seen.add(x.id);
      if (x.linked !== x.id && !(m.family && groups.has(m.group))) wrap.push(x);
    }
    if (x.linked === x.id || wrap.includes(x)) groups.add(m.group);
  }
  let out = body;
  for (const x of wrap.sort((a, b) => b.start - a.start))
    out = `${out.slice(0, x.start)}<Model id="${x.id}">${out.slice(x.start, x.end)}</Model>${out.slice(x.end)}`;
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "../content/posts");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
    const src = readFileSync(join(dir, f), "utf8");
    const end = src.startsWith("---") ? src.indexOf("\n---", 3) + 4 : 0;
    const next = src.slice(0, end) + linkModels(src.slice(end));
    if (next === src) continue;
    console.log(`${f}: ${(next.match(/<Model /g) ?? []).length - (src.match(/<Model /g) ?? []).length} link(s)`);
    if (process.argv.includes("--write")) writeFileSync(join(dir, f), next);
  }
}
