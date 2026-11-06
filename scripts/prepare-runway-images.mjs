#!/usr/bin/env node
/* The images redrawn with GPT Image 2.5 Sunburst through Runway (krizaka-internal#2455): from the picked takes, make the web files
   and the lib/media.json entries, ready for Bunny. The prompts, ratios and takes are content/image-series/runway.json.
     node scripts/prepare-runway-images.mjs <picked-dir> <out-dir>
   writes <out-dir>/series/<id>-<w>.webp (480, 960, 1280; named like cdn-assets.mjs) and replaces each entry of media.json. Then:
     node scripts/cdn-assets.mjs upload <out-dir>/series --to blog/series   (from krizaka-com)
     node scripts/gen-renditions.mjs <out-dir>                              (covers: avif + webp renditions, then upload them too)
   The pictures are never committed. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WIDTHS, webSources } from "./series-web-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function madeOf(spec, size) {
  return {
    model: "GPT Image 2.5 Sunburst",
    licence: "Runway terms of use (output owned by the customer)",
    engine: `Runway API (gpt_image_2_5_sunburst), text to image with ${spec.references.length} reference pictures (three pale covers of the series for the style, the earlier version of the picture for the scene and the characters); quality ${spec.quality}, ratio ${spec.ratio}; ${spec.takes} take(s), the best kept`,
    machine: "Runway cloud",
    via: "Runway",
    prompt: spec.prompt,
    size,
    note: "Hand-drawn ink and watercolor on white paper, light and pastel like chapters 1 to 20, redrawn after a cartoon look and a darker one (krizaka-internal#2455). No text, no logo; looked at in full size before use.",
  };
}

async function main() {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error("usage: node scripts/prepare-runway-images.mjs <picked-dir> <out-dir>");
    process.exit(2);
  }
  const { default: sharp } = await import("sharp");
  const runway = JSON.parse(readFileSync(join(root, "content/image-series/runway.json"), "utf8"));
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  mkdirSync(join(out, "series"), { recursive: true });
  for (const [id, spec] of Object.entries(runway.images)) {
    const input = join(src, spec.file);
    const meta = await sharp(input).metadata();
    const srcs = await webSources(sharp, input, out, id);
    const blur = await sharp(input).resize({ width: 16 }).webp({ quality: 30 }).toBuffer();
    media[id] = {
      kind: "image",
      width: WIDTHS[2],
      height: Math.round((meta.height * WIDTHS[2]) / meta.width),
      blur: `data:image/webp;base64,${blur.toString("base64")}`,
      srcs,
      made: madeOf(spec, `${meta.width}×${meta.height}`),
    };
    console.log(id, srcs.map((s) => s.url.split("/").pop()).join(" "));
  }
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
