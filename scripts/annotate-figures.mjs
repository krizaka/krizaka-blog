#!/usr/bin/env node
/* The annotated captures of a chapter (<Annotated>, founder 2026-10-31: « the reader must see WHAT is tested »).

     node scripts/annotate-figures.mjs <chapter-slug> <sources-dir> <out-dir>

   For each <Annotated id marks> of the chapter's English MDX, reads <sources-dir>/<id>.png (a real capture of a test: a Playwright
   reference screenshot, a Maestro takeScreenshot) and <sources-dir>/<id>.json (its provenance, `made`), draws the numbered boxes of
   `marks` into it (the margin red of the Cahier, a white halo so it reads on a light and a dark screen), and writes the sizes it is
   sold in to <out-dir>/<slug>/<id>-<w>.webp. It records their CDN URLs, the blur placeholder and the boxes drawn (`marks`, checked
   against the legend by tests/figures.test.mjs) in lib/media.json. Then, from krizaka-com:
     node scripts/cdn-assets.mjs upload <out-dir>/<slug> --to blog/posts/<slug> --env-file <env>
   The CDN name is `<name>.<first 10 hex of the file's SHA-256>.<ext>`, the rule of cdn-assets.mjs, so the URL recorded here is the one
   the upload creates. `sharp` comes with Next.js. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marksKey, marksOf } from "../lib/figures.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CDN = "https://krizaka-assets.b-cdn.net/sites/blog/posts";
const RED = "#d23a2c";
const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

/** The <Annotated> tags of an MDX body: id and marks. */
export function annotatedOf(mdx) {
  return [...mdx.matchAll(/<Annotated\b([^>]*?)\/>/gs)].map((m) => ({
    id: m[1].match(/\bid="([^"]*)"/)?.[1],
    marks: m[1].match(/\bmarks="([^"]*)"/)?.[1],
  }));
}

/** The SVG drawn over a capture of `width` × `height`: one box and one numbered tab per mark. */
export function overlaySvg(marks, width, height) {
  const tall = height > width;
  const tag = Math.round(width * (tall ? 0.065 : 0.026));
  const stroke = Math.max(3, Math.round(tag / 9));
  const px = (v, size) => Math.round((v / 100) * size);
  const shapes = marks.map((m) => {
    const x = px(m.x, width);
    const y = px(m.y, height);
    const w = px(m.w, width);
    const h = px(m.h, height);
    // The number never covers what its box frames: in the margin to the left of the box when there is room, else inside its
    // top-right corner (a full-width box: the end of a line is where a screen is emptiest).
    const gap = Math.round(stroke * 1.5);
    const outside = x - tag - gap >= 0;
    const tx = outside ? x - tag - gap : Math.min(x + w - tag - gap, width - tag);
    const ty = Math.min(Math.max(outside ? y : y + gap, 0), height - tag);
    return [
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-width="${stroke * 2.4}" opacity=".85"/>`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${RED}" stroke-width="${stroke}"/>`,
      `<rect x="${tx}" y="${ty}" width="${tag}" height="${tag}" fill="${RED}" stroke="#fff" stroke-width="${stroke}"/>`,
      `<text x="${tx + tag / 2}" y="${ty + tag * 0.72}" font-family="Courier Prime, Courier New, monospace" font-weight="700" font-size="${Math.round(tag * 0.68)}" fill="#fff" text-anchor="middle">${m.n}</text>`,
    ].join("");
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join("")}</svg>`;
}

async function main() {
  const [slug, sources, out] = process.argv.slice(2);
  if (!slug || !sources || !out) {
    console.error("usage: node scripts/annotate-figures.mjs <chapter-slug> <sources-dir> <out-dir>");
    process.exit(2);
  }
  const { default: sharp } = await import("sharp");
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  const mdx = readFileSync(join(root, `content/chapters/${slug}.en.mdx`), "utf8");
  const dir = join(out, slug);
  mkdirSync(dir, { recursive: true });
  for (const { id, marks: spec } of annotatedOf(mdx)) {
    const marks = marksOf(spec);
    const src = readFileSync(join(sources, `${id}.png`));
    const made = JSON.parse(readFileSync(join(sources, `${id}.json`), "utf8"));
    const { width, height } = await sharp(src).metadata();
    const drawn = await sharp(src)
      .composite([{ input: Buffer.from(overlaySvg(marks, width, height)) }])
      .png()
      .toBuffer();
    const srcs = [];
    for (const w of [...new Set([480, 960, width].filter((x) => x <= width))]) {
      const buf = await sharp(drawn).resize({ width: w }).webp({ quality: 82, effort: 5 }).toBuffer();
      writeFileSync(join(dir, `${id}-${w}.webp`), buf);
      srcs.push({ w, url: `${CDN}/${slug}/${id}-${w}.${hashOf(buf)}.webp` });
    }
    const tiny = await sharp(drawn).resize({ width: 24 }).webp({ quality: 30 }).toBuffer();
    media[id] = {
      kind: "image",
      width,
      height,
      blur: `data:image/webp;base64,${tiny.toString("base64")}`,
      srcs,
      made,
      marks: marksKey(marks),
    };
    console.log(`${id}: ${width}×${height}, ${marks.length} marks, ${srcs.length} sizes`);
  }
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
