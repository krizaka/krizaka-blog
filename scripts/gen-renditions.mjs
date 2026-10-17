#!/usr/bin/env node
/* The responsive renditions of every cover (Bunny's Optimizer is not enabled, so there are no width parameters: a picture is
   sold in the sizes it will be shown at, made once).
     node scripts/gen-renditions.mjs <out-dir>      makes <out-dir>/<folder>/<id>-<w>.{avif,webp} for each cover of content/posts
                                                    that has none yet (or all with --force), and records their CDN URLs in
                                                    lib/media.json under `renditions`;
     then, from krizaka-com:  node scripts/cdn-assets.mjs upload <out-dir>/<folder> --to blog/<folder> --env-file <env>
   The CDN name is `<name>.<first 10 hex of the file's SHA-256>.<ext>` — the same rule as cdn-assets.mjs, so the URL recorded
   here is the one the upload creates. The source is the widest file already on the CDN (the original is not kept); a rendition is
   never wider than it (renditionWidths). AVIF first (the smallest), WebP for the browsers without it. `sharp` comes with Next.js. */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { CDN, RENDITION_FORMATS, renditionWidths } from "./content-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUALITY = { avif: { quality: 52, effort: 6 }, webp: { quality: 78, effort: 5 } };

const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

export function sourceOf(m) {
  if (m.kind === "video") return m.poster;
  return [...m.srcs].sort((a, b) => b.w - a.w)[0].url;
}

async function main() {
  const out = process.argv[2];
  if (!out || out.startsWith("--")) {
    console.error("usage: node scripts/gen-renditions.mjs <out-dir> [--force]");
    process.exit(2);
  }
  const force = process.argv.includes("--force");
  const { default: sharp } = await import("sharp");
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  const dir = join(root, "content/posts");
  const covers = [...new Set(readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => matter(readFileSync(join(dir, f), "utf8")).data.cover).filter(Boolean))];
  const folders = new Set();
  for (const id of covers) {
    const m = media[id];
    if (!m) throw new Error(`cover "${id}" is not in lib/media.json`);
    if (m.renditions && !force) continue;
    const src = sourceOf(m);
    const folder = src.slice(CDN.length).split("/").slice(0, -1).join("/");
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (meta.width < m.width) throw new Error(`${id}: the widest file is ${meta.width} px, the entry says ${m.width}`);
    const renditions = { avif: [], webp: [] };
    mkdirSync(join(out, folder), { recursive: true });
    for (const w of renditionWidths(m.width)) {
      for (const f of RENDITION_FORMATS) {
        const data = await sharp(buf).resize({ width: w, withoutEnlargement: true })[f](QUALITY[f]).toBuffer();
        const name = `${id}-${w}`;
        writeFileSync(join(out, folder, `${name}.${f}`), data);
        renditions[f].push({ w, url: `${CDN}${folder}/${name}.${hashOf(data)}.${f}` });
        console.log(`${folder}/${name}.${f}  ${(data.length / 1024).toFixed(1)} KB`);
      }
    }
    m.renditions = renditions;
    folders.add(folder);
  }
  writeFileSync(file, `${JSON.stringify(media, null, 1)}\n`);
  for (const f of folders) console.log(`upload: node scripts/cdn-assets.mjs upload ${join(out, f)} --to blog/${f} --env-file <env>`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
