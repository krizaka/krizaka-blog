#!/usr/bin/env node
/* Step 1 of switching the covers to the image series (krizaka-blog#193): from the rendered pictures, make the web files and the
   lib/media.json entries, ready for Bunny.
     node scripts/prepare-series-covers.mjs <rendered-dir> <out-dir>
   writes <out-dir>/series/<id>-<w>.webp (480, 960, 1280; named like cdn-assets.mjs: <name>.<first 10 hex of SHA-256>.webp) and adds
   an entry `series-NN-<post>` per chapter to lib/media.json (srcs, blur, made). Then:
     node scripts/cdn-assets.mjs upload <out-dir>/series --to blog/series   (from krizaka-com)
     node scripts/gen-renditions.mjs <out-dir>                              (avif + webp renditions, then upload them too)
   The pictures are never committed. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CDN } from "./content-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTHS = [480, 960, 1280];

export function promptOf(series, index) {
  const chapter = series.chapters[index];
  const looks = chapter.birds.map((b) => series.birdLooks[b]).join(", ");
  const parts = [series.style, chapter.beat, `Birds in the picture: exactly one of each, never two of the same bird, small and round and friendly, and no others: ${looks}.`];
  if (index > 0) parts.splice(1, 0, series.continuity);
  return parts.join(" ");
}

export const coverId = (index, post) => `series-${String(index + 1).padStart(2, "0")}-${post}`;

async function main() {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error("usage: node scripts/prepare-series-covers.mjs <rendered-dir> <out-dir>");
    process.exit(2);
  }
  const { default: sharp } = await import("sharp");
  const series = JSON.parse(readFileSync(join(root, "content/image-series/series.json"), "utf8"));
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  mkdirSync(join(out, "series"), { recursive: true });
  for (const [i, c] of series.chapters.entries()) {
    const id = coverId(i, c.post);
    const input = join(src, `${String(i + 1).padStart(2, "0")}-${c.post}.png`);
    const srcs = [];
    for (const w of WIDTHS) {
      const data = await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toBuffer();
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
      writeFileSync(join(out, "series", `${id}-${w}.webp`), data);
      srcs.push({ w, url: `${CDN}series/${id}-${w}.${hash}.webp` });
    }
    const blur = await sharp(input).resize({ width: 16 }).webp({ quality: 30 }).toBuffer();
    const meta = await sharp(input).metadata();
    media[id] = {
      kind: "image",
      width: meta.width,
      height: meta.height,
      blur: `data:image/webp;base64,${blur.toString("base64")}`,
      srcs,
      made: {
        model: "FLUX.2 [klein] 4B",
        licence: "Apache-2.0",
        engine: "mflux (the image engine of Orazaka's media worker) on Metal, 4 steps, guidance 1.0, edit with the previous picture and the bird sprites as references",
        machine: "MacBook Pro, Apple M1 Max, 64 GB (Metal)",
        prompt: promptOf(series, i),
        seed: String(c.seed),
        size: `${meta.width}×${meta.height}`,
        seconds: 0,
        costUsd: 0,
        note: "Chapter " + (i + 1) + " of the image series (krizaka-blog#193): made locally with the media worker's own engine, not through an Orazaka Studio, so there is no run id. Each picture continues the previous one; reviewed at full size for duplicated birds, people, logos and text.",
      },
    };
    console.log(id, srcs.map((s) => s.url.split("/").pop()).join(" "));
  }
  writeFileSync(file, `${JSON.stringify(media, null, 1)}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
