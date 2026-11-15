#!/usr/bin/env node
/* The cover of « the architecture of krizaka-agents » (krizaka-internal#3643): a Cahier plate drawn from the article's own model,
   not generated. The container view `agents_containers` of lib/architecture.json (the layout @krizaka/architecture checked) is set
   as a specimen drawing on Seyès paper with a red margin, in blue pen ink, numbered like figures. The words are the two that do not
   change with the language (the name of the tooling, « fig. 2 · C2 »), so one picture serves FR and EN.
     node scripts/gen-architecture-cover.mjs <out-dir>   writes <out-dir>/architecture-cover.png (1280×720) and prints its hash
   Then: node scripts/gen-architecture-cover.mjs <out-dir> --media   makes the web files and the lib/media.json entry (the picture is
   never committed); upload with krizaka-com's cdn-assets.mjs (`--to blog/series`), then scripts/gen-renditions.mjs. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webSources } from "./series-web-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const COVER_ID = "architecture-krizaka-agents";
export const W = 1280;
export const H = 720;
const PAPER = "#f6f1e6";
const INK = "#1f3a93";
const RULE = "#b9c8e6";
const RED = "#c0392b";

const font = (name) =>
  `data:font/ttf;base64,${readFileSync(join(root, "node_modules/@krizaka/fonts/files/native", name)).toString("base64")}`;

/** The pen's line: the layout's edge is a chain of cubic Béziers (a start, then three points per piece). */
export function pathOf(points) {
  let d = `M${points[0].join(" ")}`;
  for (let i = 1; i + 2 < points.length; i += 3)
    d += ` C${points[i].join(" ")} ${points[i + 1].join(" ")} ${points[i + 2].join(" ")}`;
  return d;
}

/** The arrow head at the end of a line, two short pen strokes. */
export function headOf(points, size = 9) {
  const [x, y] = points.at(-1);
  const [px, py] = points.at(-2);
  const t = Math.atan2(y - py, x - px);
  const wing = (s) => `M${x} ${y} L${x - size * Math.cos(t + s)} ${y - size * Math.sin(t + s)}`;
  return `${wing(0.45)} ${wing(-0.45)}`;
}

export function plate(view, scale, ox, oy) {
  const T = ([x, y]) => [Math.round((ox + x * scale) * 10) / 10, Math.round((oy + y * scale) * 10) / 10];
  const edges = view.edges
    .map((e) => {
      const pts = e.points.map(T);
      return `<path d="${pathOf(pts)}" fill="none"/><path d="${headOf(pts)}" fill="none"/>`;
    })
    .join("");
  let figure = 0;
  const boxes = view.nodes
    .map((n) => {
      const [x, y] = T([n.x, n.y]);
      const w = n.width * scale;
      const h = n.height * scale;
      if (n.compound)
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke-dasharray="3 7"/>`;
      figure += 1;
      const dash = n.kind === "external" || n.kind === "person" ? ` stroke-dasharray="6 4"` : "";
      const extra =
        n.kind === "datastore"
          ? `<path d="M${x} ${y + 11} Q${x + w / 2} ${y + 20} ${x + w} ${y + 11}" fill="none"/>`
          : "";
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${PAPER}"${dash}/>${extra}<text class="n" x="${x + w / 2}" y="${y + h / 2 + 9}" text-anchor="middle">${figure}</text></g>`;
    })
    .join("");
  return { edges, boxes };
}

export function svgOf(view) {
  const scale = 0.5;
  const ox = 520;
  const oy = (H - view.bounds.height * scale) / 2;
  const { edges, boxes } = plate(view, scale, ox, oy);
  const lines = [];
  for (let y = 24; y < H; y += 8)
    lines.push(
      `<path d="M0 ${y} H${W}" stroke="${RULE}" stroke-width="${y % 32 === 24 ? 1.2 : 0.5}" opacity="${y % 32 === 24 ? 0.7 : 0.45}"/>`,
    );
  for (let x = 24; x < W; x += 32)
    lines.push(`<path d="M${x} 0 V${H}" stroke="${RULE}" stroke-width="0.8" opacity="0.55"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="pen" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.6"/></filter></defs>
<rect width="${W}" height="${H}" fill="${PAPER}"/>
${lines.join("")}
<path d="M110 0 V${H}" stroke="${RED}" stroke-width="2" opacity="0.7"/><path d="M116 0 V${H}" stroke="${RED}" stroke-width="1" opacity="0.45"/>
<g filter="url(#pen)" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">${edges}${boxes}</g>
<text class="t" x="150" y="${H / 2 - 6}" fill="${INK}" filter="url(#pen)">krizaka-agents</text>
<path d="M152 ${H / 2 + 14} Q300 ${H / 2 + 6} 452 ${H / 2 + 16}" stroke="${RED}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85" filter="url(#pen)"/>
<text class="m" x="152" y="${H / 2 + 52}" fill="${INK}">fig. 2 · C2</text>
</svg>`;
}

export function pageOf(view) {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Cahier;src:url(${font("KrizakaCahier-Medium.ttf")})}
@font-face{font-family:Mono;src:url(${font("CourierPrime-Regular.ttf")})}
html,body{margin:0;background:${PAPER}}svg{display:block}
.t{font:62px Cahier}.n{font:30px Cahier;fill:${INK};stroke:none}.m{font:24px Mono;letter-spacing:1px}
</style>${svgOf(view)}`;
}

async function main() {
  const [out] = process.argv.slice(2);
  if (!out || out.startsWith("--")) {
    console.error("usage: node scripts/gen-architecture-cover.mjs <out-dir> [--media]");
    process.exit(2);
  }
  mkdirSync(join(out, "series"), { recursive: true });
  const arch = JSON.parse(readFileSync(join(root, "lib/architecture.json"), "utf8"));
  const view = arch.views.en.find((v) => v.id === "agents_containers");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(pageOf(view));
  await page.evaluate(() => document.fonts.ready);
  const png = join(out, "architecture-cover.png");
  await page.screenshot({ path: png });
  await browser.close();
  console.log(png);
  if (!process.argv.includes("--media")) return;
  const { default: sharp } = await import("sharp");
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  const srcs = await webSources(sharp, png, out, COVER_ID);
  const blur = await sharp(png).resize({ width: 16 }).webp({ quality: 30 }).toBuffer();
  media[COVER_ID] = {
    kind: "image",
    width: W,
    height: H,
    blur: `data:image/webp;base64,${blur.toString("base64")}`,
    srcs,
    made: {
      model: "none: drawn from the article's own architecture model, no model",
      engine:
        "scripts/gen-architecture-cover.mjs: the container view of lib/architecture.json (laid out by @krizaka/architecture) set as an SVG plate on Seyès paper, rendered by Chromium (Playwright), KrizakaCahier and Courier Prime faces",
      machine: "MacBook Pro, Apple M1 Max, 64 GB",
      via: "local",
      size: `${W}×${H}`,
      costUsd: 0,
      note: "The cover of the architecture article: its C2 view as a specimen plate, boxes numbered like figures, the tooling's name in pen. Not generated by a model; the layout is the one the article's checked model gives (krizaka-internal#3643).",
    },
  };
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
  console.log(COVER_ID, srcs.map((s) => s.url.split("/").pop()).join(" "));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
