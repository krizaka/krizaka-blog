#!/usr/bin/env node
/* The annotated captures of a chapter (<Annotated>, founder 2026-10-31: « the reader must see WHAT is tested »).

     node scripts/annotate-figures.mjs <chapter-slug> <sources-dir> <out-dir>

   For each <Annotated id marks> of the chapter's English MDX, reads <sources-dir>/<id>.png (a real screen of a tested page: a
   showcase capture of the page a Playwright journey checks, a Maestro takeScreenshot) and <sources-dir>/<id>.json (its provenance,
   `made`), draws the pen marks of `marks` into it in the Cahier's ink (CTO review 2026-10-31: a loop, an underline, a bracket in the
   margin, the corners of the screen, each with its number in a pen circle; the ink of the screen's own theme), and writes the sizes it
   is sold in to <out-dir>/<slug>/<id>-<w>.webp. It records their CDN URLs, the blur placeholder and the marks drawn (`marks`, checked
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
const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

/* The pen of the Cahier (@krizaka/tokens --kz-paper-rule-margin, the margin red, on the paper or the slate): a screen in the light
   theme is marked in the paper's red ink, a screen in the dark theme in the slate's lighter one, each over a halo of its own paper so
   a stroke reads on a busy screen. The numbers are Courier Prime (@krizaka/fonts), the typewriter of the Cahier's notes. */
export const PENS = {
  light: { ink: "hsl(5 62% 40%)", paper: "hsl(210 33% 99%)" },
  dark: { ink: "hsl(8 64% 66%)", paper: "hsl(150 10% 12%)" },
};

/** The <Annotated> tags of an MDX body: id and marks. */
export function annotatedOf(mdx) {
  return [...mdx.matchAll(/<Annotated\b([^>]*?)\/>/gs)].map((m) => ({
    id: m[1].match(/\bid="([^"]*)"/)?.[1],
    marks: m[1].match(/\bmarks="([^"]*)"/)?.[1],
  }));
}

/** A small seeded wobble: the same mark is drawn the same way at every run, so the picture's hash stays stable. */
function wobble(seed) {
  let t = seed * 9301 + 49297;
  return (amp) => {
    t = (t * 9301 + 49297) % 233280;
    return (t / 233280 - 0.5) * 2 * amp;
  };
}
const r1 = (v) => Math.round(v * 10) / 10;

/** The pen strokes of one mark (path data) and the centre of its number. */
function strokeOf(m, box, size, tag, sw, busy) {
  const { x, y, w, h } = box;
  const { width, height } = size;
  const j = wobble(m.n + 1);
  const r = tag / 2;
  const gap = sw * 2;
  const fits = (cx, cy) => cx - r >= 1 && cy - r >= 1 && cx + r <= width - 1 && cy + r <= height - 1;
  // Of the places that fit, the emptiest of the screen under the number (the first one written wins a tie).
  const emptiest = (spots) => {
    const ok = spots.filter(([cx, cy]) => fits(cx, cy));
    if (ok.length === 0) return spots[0];
    return ok.reduce((best, s) => (busy(s[0], s[1], r) < busy(best[0], best[1], r) - 6 ? s : best));
  };
  if (m.shape === "under") {
    // A line under the text, a little uphill, gone over twice as a hand does; the number at its end, where a line of text is empty.
    const y0 = y + h + gap;
    const x0 = x - sw;
    const x1 = x + w + sw * 2;
    const d = [
      `M${r1(x0)} ${r1(y0 + j(sw * 0.4))} Q${r1((x0 + x1) / 2)} ${r1(y0 + sw * 1.2 + j(sw * 0.5))} ${r1(x1)} ${r1(y0 - sw * 0.6)}`,
      `M${r1(x0 + w * 0.08)} ${r1(y0 + sw * 1.1)} Q${r1((x0 + x1) / 2)} ${r1(y0 + sw * 1.9)} ${r1(x1 - w * 0.04)} ${r1(y0 + sw * 0.5)}`,
    ];
    const cy = Math.min(Math.max(y + h / 2, r + 1), height - r - 1);
    const [cx] = emptiest([
      [x1 + gap + r, cy],
      [x0 - gap - r, cy],
    ]);
    return { d, cx, cy };
  }
  if (m.shape === "bracket") {
    // A bracket in the margin of a block, the way a reader holds a paragraph; the number beside it, else in the block's top-right corner.
    const bx = x - gap * 1.5;
    const arm = Math.max(sw * 3, Math.min(w * 0.04, tag * 0.6));
    const d = [
      `M${r1(bx + arm)} ${r1(y + j(sw * 0.3))} Q${r1(bx)} ${r1(y)} ${r1(bx + j(sw * 0.3))} ${r1(y + arm)} L${r1(bx + j(sw * 0.5))} ${r1(y + h - arm)} Q${r1(bx)} ${r1(y + h)} ${r1(bx + arm)} ${r1(y + h + j(sw * 0.3))}`,
    ];
    const cx = bx - gap - r;
    if (fits(cx, y + h / 2)) return { d, cx, cy: y + h / 2 };
    return { d, cx: x + w - r - gap * 2, cy: y + r + gap * 2 };
  }
  if (m.shape === "frame") {
    // The whole screen: the four corners of a picture pasted in the notebook; the number inside the bottom-right one.
    const k = Math.min(w, h) * 0.06;
    const corners = [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ];
    const d = corners.map(
      ([cx, cy, sx, sy]) => `M${r1(cx)} ${r1(cy + sy * k)} L${r1(cx)} ${r1(cy)} L${r1(cx + sx * k)} ${r1(cy)}`,
    );
    return { d, cx: x + w - k - r, cy: y + h - k - r };
  }
  // ring: a loop around a control, a little more than one turn, not quite closed on itself.
  const cx0 = x + w / 2;
  const cy0 = y + h / 2;
  const rx = w / 2 + Math.max(gap * 1.6, h * 0.35);
  const ry = h / 2 + Math.max(gap * 1.4, h * 0.3);
  const pts = [];
  for (let i = 0; i <= 28; i += 1) {
    const a = Math.PI * (1.12 + (i / 28) * 2.12);
    const grow = 1 + (i / 28) * 0.07;
    pts.push(`${r1(cx0 + Math.cos(a) * rx * grow + j(sw * 0.35))} ${r1(cy0 + Math.sin(a) * ry * grow + j(sw * 0.35))}`);
  }
  const d = [`M${pts[0]} L${pts.slice(1).join(" L")}`];
  const [cx, cy] = emptiest(
    [225, 135, 90, 315, 45, 180, 0].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return [cx0 + Math.cos(a) * (rx + r * 0.9), cy0 + Math.sin(a) * (ry + r * 0.9)];
    }),
  );
  return { d, cx, cy };
}

/** The SVG drawn over a capture of `width` × `height`: the pen stroke of each mark and its number in a pen circle, in the ink of the
    screen's theme (`light` | `dark`). `busy(cx, cy, r)` says how much is drawn under a spot (scripts: the pixels' spread), so a number
    goes where the screen is emptiest; without it, the first place that fits. */
export function overlaySvg(marks, width, height, theme = "light", busy = () => 0) {
  const pen = PENS[theme] ?? PENS.light;
  const tag = Math.round(width * (height > width ? 0.072 : 0.03));
  const sw = Math.max(3, Math.round(tag / 9));
  const px = (v, size) => (v / 100) * size;
  const out = marks.map((m) => {
    const box = { x: px(m.x, width), y: px(m.y, height), w: px(m.w, width), h: px(m.h, height) };
    const { d, cx, cy } = strokeOf(m, box, { width, height }, tag, sw, busy);
    const path = d.join(" ");
    const r = tag / 2;
    return [
      `<g data-mark="${m.n}" data-shape="${m.shape}">`,
      `<path d="${path}" fill="none" stroke="${pen.paper}" stroke-opacity=".8" stroke-width="${sw * 2.6}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="${path}" fill="none" stroke="${pen.ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${pen.paper}"/>`,
      `<circle cx="${r1(cx + sw * 0.15)}" cy="${r1(cy - sw * 0.1)}" r="${r1(r - sw * 0.6)}" fill="none" stroke="${pen.ink}" stroke-width="${r1(sw * 0.75)}"/>`,
      `<text x="${r1(cx)}" y="${r1(cy + tag * 0.22)}" font-family="Courier Prime, Courier New, monospace" font-weight="700" font-size="${Math.round(tag * 0.64)}" fill="${pen.ink}" text-anchor="middle">${m.n}</text>`,
      `</g>`,
    ].join("");
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${out.join("")}</svg>`;
}

/** Whether a capture is a light or a dark screen: the mean luminance of its pixels. */
export async function themeOf(sharp, src) {
  const { channels } = await sharp(src).stats();
  const [r, g, b] = channels.map((c) => c.mean);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128 ? "light" : "dark";
}

/** How much is drawn under a square of the capture: the spread of its grey levels (0 on an empty surface). */
export async function busyOf(sharp, src) {
  const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
  return (cx, cy, r) => {
    let n = 0;
    let sum = 0;
    let sq = 0;
    for (let y = Math.max(0, Math.round(cy - r)); y < Math.min(info.height, Math.round(cy + r)); y += 2)
      for (let x = Math.max(0, Math.round(cx - r)); x < Math.min(info.width, Math.round(cx + r)); x += 2) {
        const v = data[(y * info.width + x) * info.channels];
        n += 1;
        sum += v;
        sq += v * v;
      }
    return n ? Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)) : 0;
  };
}

/** Courier Prime for the numbers: a fontconfig file that adds @krizaka/fonts' files to the system's, set before sharp loads. */
function typewriter(dir) {
  const fonts = join(root, "node_modules/@krizaka/fonts/files/native");
  const conf = join(dir, ".fonts.conf");
  writeFileSync(
    conf,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fonts}</dir><include ignore_missing="yes">/etc/fonts/fonts.conf</include><cachedir>${join(dir, ".fontcache")}</cachedir></fontconfig>`,
  );
  process.env.FONTCONFIG_FILE = conf;
}

async function main() {
  const [slug, sources, out] = process.argv.slice(2);
  if (!slug || !sources || !out) {
    console.error("usage: node scripts/annotate-figures.mjs <chapter-slug> <sources-dir> <out-dir>");
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  typewriter(out);
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
    const theme = await themeOf(sharp, src);
    const drawn = await sharp(src)
      .composite([{ input: Buffer.from(overlaySvg(marks, width, height, theme, await busyOf(sharp, src))) }])
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
    console.log(`${id}: ${width}×${height}, ${theme}, ${marks.length} marks, ${srcs.length} sizes`);
  }
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
