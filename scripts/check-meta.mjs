#!/usr/bin/env node
/* What every built page shows a search engine (run on out/ after `npm run build`): a <title> of at most 60 characters and
   a meta description of at most 155 (longer ones are cut in the results), exactly one h1, an alt on every image, and no
   NaN or undefined in the text.
   Usage: node scripts/check-meta.mjs out   — the 404, the editor (/admin) and the private preview are skipped. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** The problems of one page's HTML; an empty list when it is fine. */
export function metaProblems(html) {
  const out = [];
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  if (!title) out.push("no title");
  else if ([...title].length > TITLE_MAX) out.push(`title is ${[...title].length} characters (max ${TITLE_MAX}): ${title}`);
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (description === undefined) out.push("no meta description");
  else if ([...decode(description)].length > DESCRIPTION_MAX) out.push(`description is ${[...decode(description)].length} characters (max ${DESCRIPTION_MAX})`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) out.push(`${h1} h1 (one expected)`);
  for (const img of html.match(/<img\b[^>]*>/g) ?? []) if (!/\balt=/.test(img)) out.push(`an image without alt: ${img.slice(0, 80)}`);
  /* A number that failed to compute (a prop the renderer dropped) must never reach a reader. */
  if (/>[^<]*\b(NaN|undefined)\b[^<]*</.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) out.push("the page shows NaN or undefined");
  return out;
}

function* pages(dir, root = dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(root, p);
    if (/^(admin|preview|_next|og|fr\/og|404|_not-found)(\/|$)/.test(rel)) continue;
    if (statSync(p).isDirectory()) yield* pages(p, root);
    else if (name === "index.html") yield p;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? "out";
  const problems = [];
  let n = 0;
  for (const file of pages(dir)) {
    n++;
    for (const p of metaProblems(readFileSync(file, "utf8"))) problems.push(`/${relative(dir, file).replace(/index\.html$/, "")}: ${p}`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`check-meta: ${n} pages — titles ≤ ${TITLE_MAX}, descriptions ≤ ${DESCRIPTION_MAX}, one h1, every image with an alt`);
}
