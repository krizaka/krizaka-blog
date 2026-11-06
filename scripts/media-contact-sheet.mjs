#!/usr/bin/env node
/* A side-by-side contact sheet of every picture the posts show, to be looked at by a human before a PR that touches a picture
   (krizaka-internal#2455): the series reads as one, or it does not.
     node scripts/media-contact-sheet.mjs <name>        writes <tmpdir>/media-contact-sheet/<name>/covers.png (every cover, in chapter
                                                        order) and inline.png (every picture inside a post), then upload them
                                                        with krizaka-com's pr-assets.mjs and paste them in the PR. <name> is a
                                                        plain word (letters, digits, - _ .), never a path.
   `usedImages` is the list the sheets are made from (tested: tests/media-contact-sheet.test.mjs). Diagrams, screen captures,
   test screenshots and clips are listed but flagged by their kind: only generated stills are judged on the look. */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

/** The pictures one post shows: its cover, then the `<Figure>` and `<Clip>` ids of its text that are still images. */
function picturesOf(text, media) {
  const order = Number(text.match(/^chapter: (\d+)/m)?.[1] ?? 100);
  const cover = text.match(/^cover: "?([^"\n]+)"?/m)?.[1]?.trim();
  const rows = [];
  if (cover && media[cover]?.kind === "image") rows.push({ order, id: cover, role: "cover", entry: media[cover] });
  for (const [, id] of text.matchAll(/<(?:Figure|Clip)[^>]*?\bid="([^"]+)"/gs)) {
    if (media[id]?.kind === "image") rows.push({ order, id, role: "inline", entry: media[id] });
  }
  return rows;
}

export function usedImages(base = root) {
  const media = JSON.parse(readFileSync(join(base, "lib/media.json"), "utf8"));
  const rows = [];
  for (const dir of ["content/chapters", "content/posts"]) {
    for (const file of readdirSync(join(base, dir))
      .filter((f) => f.endsWith(".en.mdx"))
      .sort()) {
      const slug = file.replace(".en.mdx", "");
      const text = readFileSync(join(base, dir, file), "utf8");
      rows.push(...picturesOf(text, media).map((r) => ({ ...r, slug })));
    }
  }
  return rows.sort((a, b) => a.order - b.order);
}

/** The folder a run writes to: a plain name under the system's temporary folder, so an argument can never walk out of it. */
export function outDirOf(name) {
  if (!/^[\w.-]+$/.test(name ?? "") || name.startsWith(".")) return null;
  return join(tmpdir(), "media-contact-sheet", name);
}

const W = 480;
const H = 270;
const PAD = 12;
const LABEL = 34;
const COLS = 4;

/** The tile label: chapter number (or `post`), the picture id, and whether it is judged by nature; escaped for SVG. */
export function labelOf(r) {
  const where = r.order < 100 ? `ch${String(r.order).padStart(2, "0")}` : "post";
  const tag = kindOf(r.entry) === "generated" ? "" : " · by nature";
  return `${where} ${r.id}${tag}`.slice(0, 60).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

async function tileOf(sharp, r) {
  const url = [...r.entry.srcs].sort((a, b) => Math.abs(a.w - W) - Math.abs(b.w - W))[0].url;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const tile = await sharp(buf).resize(W, H, { fit: "contain", background: "#0e0e12" }).png().toBuffer();
  return { tile, label: labelOf(r) };
}

const labelSvg = (t) =>
  `<svg width="${W}" height="${LABEL}"><text x="0" y="22" font-family="sans-serif" font-size="15" fill="#dcdce6">${t}</text></svg>`;

async function writeSheet(sharp, tiles, file) {
  const composites = tiles.flatMap((t, i) => {
    const x = PAD + (i % COLS) * (W + PAD);
    const y = PAD + Math.floor(i / COLS) * (H + LABEL + PAD);
    return [
      { input: t.tile, left: x, top: y + LABEL },
      { input: Buffer.from(labelSvg(t.label)), left: x, top: y },
    ];
  });
  const background = "#0e0e12";
  const height = Math.ceil(tiles.length / COLS) * (H + LABEL + PAD) + PAD;
  await sharp({ create: { width: COLS * (W + PAD) + PAD, height, channels: 3, background } })
    .composite(composites)
    .png()
    .toFile(file);
}

async function main() {
  const out = outDirOf(process.argv[2]);
  if (!out) {
    console.error("usage: node scripts/media-contact-sheet.mjs <name>   (a plain word: letters, digits, - _ .)");
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  const { default: sharp } = await import("sharp");
  const rows = usedImages();
  for (const role of ["cover", "inline"]) {
    const tiles = [];
    for (const r of rows.filter((x) => x.role === role)) tiles.push(await tileOf(sharp, r));
    await writeSheet(sharp, tiles, join(out, role === "cover" ? "covers.png" : "inline.png"));
    console.log(`${role}: ${tiles.length} pictures`);
  }
  const list = rows.map(({ order, slug, id, role, entry }) => ({
    order,
    slug,
    id,
    role,
    kind: kindOf(entry),
    model: entry.made?.model ?? null,
  }));
  writeFileSync(join(out, "list.json"), `${JSON.stringify(list, null, 2)}\n`);
  console.log(out);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
