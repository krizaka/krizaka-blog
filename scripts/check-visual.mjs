#!/usr/bin/env node
/* Visual baselines of a post's top (the byline row) and end (the engage block and the signature), in a real browser, light and dark,
   at 390 and 1440 px (krizaka-internal#3643, founder 2026-11-15: a regression of the end block and of the other-language link went
   to production because no check looked at them). A change to these templates changes the pictures: the baseline is then remade and
   approved in the same pull request (`--update`), so a reviewer sees it.

     node scripts/check-visual.mjs --base http://localhost:3000            compare with tests/visual/
     node scripts/check-visual.mjs --base http://localhost:3000 --update   write the baselines

   The comparison is done in the browser (a canvas), with no dependency: the share of pixels that differ by more than a visible step
   must stay under TOLERANCE, which leaves room for the anti-aliasing of another machine and none for a missing block or a button
   where a link was. Baselines are made on the CI's own image (Linux); a local macOS run may differ by the text's rendering only. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/** A post of the founder's, new and old, and the shots taken of each. */
export const POSTS = ["the-architecture-of-krizaka-agents", "understanding-ai-before-you-start"];
export const THEMES = ["light", "dark"];
export const WIDTHS = [390, 1440];
export const PARTS = ["top", "end"];
/** The share of pixels allowed to differ (per-channel step above 48 of 255). */
export const TOLERANCE = 0.02;

export const nameOf = (slug, part, theme, width) => `${slug}.${part}.${theme}.${width}.png`;

/** The shots a run takes, one per post, part, theme and width. */
export const shots = () =>
  POSTS.flatMap((slug) =>
    PARTS.flatMap((part) => THEMES.flatMap((theme) => WIDTHS.map((width) => ({ slug, part, theme, width })))),
  );

/** What is wrong when a picture differs by `ratio` of its pixels, or has a different size. */
export function visualProblem(name, ratio, sameSize) {
  if (!sameSize) return `${name}: the picture has another size than its baseline`;
  if (ratio > TOLERANCE)
    return `${name}: ${(ratio * 100).toFixed(1)} % of the pixels differ (limit ${TOLERANCE * 100} %)`;
  return null;
}

/** The two PNGs compared in the page: `[sameSize, ratio]`. */
const compareInBrowser = async (page, a, b) =>
  page.evaluate(
    async ([x, y]) => {
      const load = (src) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = src;
        });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return [false, 1];
      const data = (img) => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const [da, db] = [data(ia), data(ib)];
      let differ = 0;
      for (let p = 0; p < da.length; p += 4)
        if (Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])) > 48)
          differ += 1;
      return [true, differ / (da.length / 4)];
    },
    [a, b],
  );

async function take(browser, base, { slug, part, theme, width }) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  await context.addInitScript((t) => localStorage.setItem("kz-theme", t), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(`${base}/basics/${slug}/`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const box = async (sel) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    return el.boundingBox();
  };
  let png;
  if (part === "top") {
    png = await page.locator(".bl-byline").first().screenshot();
  } else {
    await box(".bl-sign");
    await page.waitForTimeout(400);
    /* From the engage block to the signature, in the article's own columns: the sticky contents column beside them depends on the
       text of the post, so it is left out. */
    const span = await page.evaluate(() => {
      const rect = (sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right };
      };
      const [engage, sign] = [rect(".bl-engage"), rect(".bl-sign")];
      const left = Math.max(0, Math.min(engage.left, sign.left) - 16);
      const right = Math.min(innerWidth, Math.max(engage.right, sign.right) + 16);
      const top = Math.max(0, engage.top - 16);
      return { x: left, y: top, width: right - left, height: sign.bottom + 16 - top };
    });
    png = await page.screenshot({ fullPage: true, clip: span });
  }
  await context.close();
  return png;
}

async function main() {
  const args = process.argv.slice(2);
  const base = (args[args.indexOf("--base") + 1] || "http://localhost:3000").replace(/\/$/, "");
  const update = args.includes("--update");
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../tests/visual");
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const checker = await (await browser.newContext()).newPage();
  const problems = [];
  for (const shot of shots()) {
    const name = nameOf(shot.slug, shot.part, shot.theme, shot.width);
    let png;
    try {
      png = await take(browser, base, shot);
    } catch (e) {
      problems.push(`${name}: ${String(e.message).split("\n")[0]}`);
      continue;
    }
    const file = join(dir, name);
    if (update) {
      writeFileSync(file, png);
      continue;
    }
    if (!existsSync(file)) {
      problems.push(`${name}: no baseline (node scripts/check-visual.mjs --update, and review the pictures)`);
      continue;
    }
    const url = (b) => `data:image/png;base64,${b.toString("base64")}`;
    const [sameSize, ratio] = await compareInBrowser(checker, url(readFileSync(file)), url(png));
    const problem = visualProblem(name, ratio, sameSize);
    if (problem) {
      problems.push(problem);
      writeFileSync(join(process.env.VISUAL_OUT ?? dir, `${name}.actual.png`), png);
    }
  }
  await browser.close();
  if (problems.length > 0) {
    console.error(`check-visual:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`check-visual: ${shots().length} pictures ${update ? "written" : "match their baselines"}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
