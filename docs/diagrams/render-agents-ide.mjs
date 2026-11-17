#!/usr/bin/env node
/* Renders the two « In the IDE » figures of the agents chapter (krizaka-internal#4125) from agents-ide.html, FR and EN, with
   Playwright's pinned Chromium: <out>/agents-ide-<fig>-<lang>.png at 1600 px wide (the full figure, for a social post), then the
   blog's sizes <out>/<id>-<w>.webp (480/768/1200/1600) and the blur placeholder printed as JSON for lib/media.json.
     node docs/diagrams/render-agents-ide.mjs <out-dir>
   Then, from krizaka-com: node scripts/cdn-assets.mjs upload <out-dir>/webp --to blog/posts/how-our-agent-teams-talk */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("usage: render-agents-ide.mjs <out-dir>");
const WIDTHS = [480, 768, 1200, 1600];
const FIGS = ["tasks", "log"];
const LANGS = ["fr", "en"];
const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

mkdirSync(join(out, "webp"), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const entries = {};
for (const fig of FIGS) {
  for (const lang of LANGS) {
    const url = `${pathToFileURL(join(here, "agents-ide.html")).href}?fig=${fig}&lang=${lang}`;
    await page.goto(url);
    await page.waitForSelector("body[data-ready='1']");
    const png = join(out, `agents-ide-${fig}-${lang}.png`);
    await page.locator("#page").screenshot({ path: png });
    const meta = await sharp(png).metadata();
    const id = `agents-ide-${fig}-${lang}`;
    const srcs = [];
    for (const w of WIDTHS) {
      const buf = await sharp(png).resize({ width: w }).webp({ quality: 86, effort: 5 }).toBuffer();
      const name = `${id}-${w}.${hashOf(buf)}.webp`;
      writeFileSync(join(out, "webp", `${id}-${w}.webp`), buf);
      srcs.push({ w, url: `https://krizaka-assets.b-cdn.net/sites/blog/posts/how-our-agent-teams-talk/${name}` });
    }
    const tiny = await sharp(png).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    entries[id] = {
      kind: "image",
      style: "diagram",
      width: meta.width,
      height: meta.height,
      blur: `data:image/webp;base64,${tiny.toString("base64")}`,
      srcs,
    };
  }
}
await browser.close();
writeFileSync(join(out, "media-entries.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(
  Object.entries(entries)
    .map(([k, v]) => `${k} ${v.width}x${v.height}`)
    .join("\n"),
);
