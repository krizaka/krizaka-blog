#!/usr/bin/env node
/* Step 1 of switching the covers to the image series (krizaka-blog#193): from the rendered pictures, make the web files and the
   lib/media.json entries, ready for Bunny.
     node scripts/prepare-series-covers.mjs <rendered-dir> <out-dir> [--only <chapter>]
   writes <out-dir>/series/<id>-<w>.webp (480, 960, 1280; named like cdn-assets.mjs: <name>.<first 10 hex of SHA-256>.webp) and adds
   an entry `series-NN-<post>` per chapter to lib/media.json (srcs, blur, made). Then:
     node scripts/cdn-assets.mjs upload <out-dir>/series --to blog/series   (from krizaka-com)
     node scripts/gen-renditions.mjs <out-dir>                              (avif + webp renditions, then upload them too)
   The pictures are never committed. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CDN_V2 } from "./content-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTHS = [480, 960, 1280];

export function promptOf(series, index) {
  const chapter = series.chapters[index];
  const looks = chapter.birds.map((b) => series.birdLooks[b]).join(", ");
  const parts = [
    series.style,
    chapter.beat,
    `Birds in the picture: exactly one of each, never two of the same bird, small and round and friendly, and no others: ${looks}.`,
  ];
  if (index > 0) parts.splice(1, 0, series.continuity);
  return parts.join(" ");
}

/** The founder's picks of batch 2026-10-30-blog-v2 (krizaka-blog#193): series index (1-based) -> candidate and Orazaka Studio run id.
    Chapter 10 keeps its cover. Chapter 18 was not in the batch: it wears the candidate left unpicked for chapter 16 (B, a desk of
    measures), chapter 19 the one left unpicked for chapter 11 (B, a train on a bridge at dawn), chapter 20 the one left unpicked for
    chapter 13 (A, a long vaulted hall); the third element names the chapter
    it was rendered for. */
export const PICKS = {
  1: ["a", "5b9b8a1f"],
  2: ["b", "4d45823d"],
  3: ["a", "f80e55ac"],
  4: ["a", "14c20ad4"],
  5: ["a", "7f279725"],
  6: ["a", "8381c095"],
  7: ["a", "5d3e9e4a"],
  8: ["a", "dde98cb5"],
  9: ["a", "1161b304"],
  11: ["a", "349af806"],
  12: ["b", "e63039d3"],
  13: ["b", "8e4ac401"],
  14: ["b", "10af5d48"],
  15: ["b", "0aca8edc"],
  16: ["a", "e7b9a24d"],
  17: ["a", "44caa163"],
  18: ["b", "5f03097e", 16],
  19: ["b", "944108f9", 11],
  20: ["a", "f4ad93a7", 13],
};

export const coverId = (index, post) => `series-${String(index + 1).padStart(2, "0")}-${post}`;

async function main() {
  const [src, out] = process.argv.slice(2);
  const only = process.argv.includes("--only") ? Number(process.argv[process.argv.indexOf("--only") + 1]) : undefined;
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
    if (!PICKS[i + 1] || (only && only !== i + 1)) continue;
    const [pick, runId, renderedFor] = PICKS[i + 1];
    const input = join(src, `${String(i + 1).padStart(2, "0")}-${c.post}.png`);
    const srcs = [];
    for (const w of WIDTHS) {
      const data = await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toBuffer();
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
      writeFileSync(join(out, "series", `${id}-${w}.webp`), data);
      srcs.push({ w, url: `${CDN_V2}series/${id}-${w}.${hash}.webp` });
    }
    const blur = await sharp(input).resize({ width: 16 }).webp({ quality: 30 }).toBuffer();
    const meta = await sharp(input).metadata();
    media[id] = {
      kind: "image",
      width: Math.min(meta.width, WIDTHS[2]), // the widest file sold
      height: Math.round((meta.height * Math.min(meta.width, WIDTHS[2])) / meta.width),
      blur: `data:image/webp;base64,${blur.toString("base64")}`,
      srcs,
      made: {
        model: "FLUX.1 [schnell]",
        licence: "Apache-2.0",
        engine:
          "image-generation through Orazaka Studio (dev.orazaka.com), one RunPod L40S batch, hand-drawn ink and watercolor in the Krizaka palette",
        machine: "RunPod L40S",
        via: "Orazaka Studio",
        size: `${meta.width}×${meta.height}`,
        note: renderedFor
          ? `Chapter ${i + 1} of the image series: candidate ${pick.toUpperCase()} of batch 2026-10-30-blog-v2 (Orazaka Studio run ${runId}), rendered for chapter ${renderedFor} and left unpicked there (krizaka-blog#193). No person, no text, no logo.`
          : `Chapter ${i + 1} of the image series, candidate ${pick.toUpperCase()} of batch 2026-10-30-blog-v2 (Orazaka Studio run ${runId}) chosen by the founder (krizaka-blog#193). No person, no text, no logo.`,
      },
    };
    console.log(id, srcs.map((s) => s.url.split("/").pop()).join(" "));
  }
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
