#!/usr/bin/env node
/* A side-by-side contact sheet of every picture the posts show, to be looked at by a human before a PR that touches a picture
   (krizaka-internal#2455): the series reads as one, or it does not.
     node scripts/media-contact-sheet.mjs <out-dir>     writes <out-dir>/covers.png (every cover, in chapter order) and
                                                        <out-dir>/inline.png (every picture inside a post), then upload them
                                                        with krizaka-com's pr-assets.mjs and paste them in the PR.
   `usedImages` is the list the sheets are made from (tested: tests/media-contact-sheet.test.mjs). Diagrams, screen captures,
   test screenshots and clips are listed but flagged by their kind: only generated stills are judged on the look. */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How a picture is judged: `generated` (a still made by a model: must look like the series), or `by-nature` (a diagram, a screen
    capture, a clip or a model comparison, which show something other than the series' look). */
export function kindOf(entry) {
  const model = entry.made?.model ?? "";
  if (
    entry.kind !== "image" ||
    entry.style === "diagram" ||
    /screen|screenshot|none:|Title test|Wan 2|LTX|Stable Diffusion/i.test(model)
  ) {
    return "by-nature";
  }
  return "generated";
}

export function usedImages(base = root) {
  const media = JSON.parse(readFileSync(join(base, "lib/media.json"), "utf8"));
  const rows = [];
  for (const dir of ["content/chapters", "content/posts"]) {
    for (const file of readdirSync(join(base, dir))
      .filter((f) => f.endsWith(".en.mdx"))
      .sort()) {
      const text = readFileSync(join(base, dir, file), "utf8");
      const slug = file.replace(".en.mdx", "");
      const chapter = text.match(/^chapter: (\d+)/m)?.[1];
      const order = chapter ? Number(chapter) : 100;
      const cover = text.match(/^cover: "?([^"\n]+)"?/m)?.[1]?.trim();
      if (cover && media[cover]?.kind === "image")
        rows.push({ order, slug, id: cover, role: "cover", entry: media[cover] });
      for (const [, id] of text.matchAll(/<(?:Figure|Clip)[^>]*?\bid="([^"]+)"/gs)) {
        if (media[id]?.kind === "image") rows.push({ order, slug, id, role: "inline", entry: media[id] });
      }
    }
  }
  return rows.sort((a, b) => a.order - b.order);
}

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: node scripts/media-contact-sheet.mjs <out-dir>");
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  const { default: sharp } = await import("sharp");
  const rows = usedImages();
  const W = 480,
    H = 270,
    PAD = 12,
    LABEL = 34,
    COLS = 4;
  for (const role of ["cover", "inline"]) {
    const items = rows.filter((r) => r.role === role);
    const tiles = [];
    for (const r of items) {
      const url = [...r.entry.srcs].sort((a, b) => Math.abs(a.w - W) - Math.abs(b.w - W))[0].url;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const tile = await sharp(buf).resize(W, H, { fit: "contain", background: "#0e0e12" }).png().toBuffer();
      const tag = kindOf(r.entry) === "generated" ? "" : " · by nature";
      const label = `${r.order < 100 ? `ch${String(r.order).padStart(2, "0")}` : "post"} ${r.id}${tag}`
        .slice(0, 60)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;");
      tiles.push({ tile, label });
    }
    const rowsN = Math.ceil(tiles.length / COLS);
    const svg = (x, y, t) =>
      `<svg width="${W}" height="${LABEL}"><text x="0" y="22" font-family="sans-serif" font-size="15" fill="#dcdce6">${t}</text></svg>`;
    const composites = [];
    tiles.forEach((t, i) => {
      const x = PAD + (i % COLS) * (W + PAD);
      const y = PAD + Math.floor(i / COLS) * (H + LABEL + PAD);
      composites.push(
        { input: t.tile, left: x, top: y + LABEL },
        { input: Buffer.from(svg(x, y, t.label)), left: x, top: y },
      );
    });
    await sharp({
      create: {
        width: COLS * (W + PAD) + PAD,
        height: rowsN * (H + LABEL + PAD) + PAD,
        channels: 3,
        background: "#0e0e12",
      },
    })
      .composite(composites)
      .png()
      .toFile(join(out, `${role === "cover" ? "covers" : "inline"}.png`));
    console.log(`${role}: ${tiles.length} pictures`);
  }
  writeFileSync(
    join(out, "list.json"),
    `${JSON.stringify(
      rows.map(({ order, slug, id, role, entry }) => ({
        order,
        slug,
        id,
        role,
        kind: kindOf(entry),
        model: entry.made?.model ?? null,
      })),
      null,
      2,
    )}\n`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
