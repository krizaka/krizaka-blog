/* The web files of one series picture, shared by prepare-series-covers.mjs and prepare-runway-images.mjs: three widths of a webp,
   written to <out>/series/<id>-<w>.webp (named like cdn-assets.mjs, which adds the hash when it uploads) and the CDN URLs they will have. */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CDN_V2 } from "./content-rules.mjs";

export const WIDTHS = [480, 960, 1280];

export async function webSources(sharp, input, out, id) {
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
  return srcs;
}
