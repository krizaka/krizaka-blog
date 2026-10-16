#!/usr/bin/env node
/* The layout the reader sees, in a real browser (Playwright, Chromium): at 1750, 1366 and 390 px the bar and the page's h1
   stay inside the window (nothing cut at the right edge, no sideways scroll), and the bar's links show a focus ring only to
   the keyboard (:focus-visible): none on load, none after a click, one ring (no double ring) after Tab.
   Usage: node scripts/check-layout.mjs --base http://localhost:3000 [--path /posts/<slug>/ …] [--posts out] */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const base = (args[args.indexOf("--base") + 1] || "http://localhost:3000").replace(/\/$/, "");
const paths = ["/", "/fr/"];
args.forEach((a, i) => a === "--path" && paths.push(args[i + 1]));
/* --posts <out dir>: every post the build wrote, in both languages (out/posts/<slug>/, out/fr/posts/<slug>/). */
const postsDir = args.includes("--posts") ? args[args.indexOf("--posts") + 1] : undefined;
if (postsDir) {
  for (const prefix of ["", "fr/"]) {
    const dir = join(postsDir, prefix, "posts");
    if (existsSync(dir)) for (const slug of readdirSync(dir)) if (existsSync(join(dir, slug, "index.html"))) paths.push(`/${prefix}posts/${slug}/`);
  }
}
const WIDTHS = [1750, 1366, 390];

/** The problems of one page as laid out: boxes past the right edge, a title wider than its box, sideways scroll. */
const layoutProblems = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw || document.body.scrollWidth > vw) out.push(`the page scrolls sideways (${document.body.scrollWidth} > ${vw})`);
  for (const e of document.querySelectorAll("h1, .kz-site-bar, .kz-site-bar a, .kz-site-bar button")) {
    const r = e.getBoundingClientRect();
    if (!r.width || getComputedStyle(e).visibility === "hidden") continue;
    if (r.left < -0.5 || r.right > vw + 0.5) out.push(`${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 40)}" runs past the window (${Math.round(r.left)}–${Math.round(r.right)} of ${vw})`);
  }
  /* Nothing of the content past the right edge: a wide table or code block scrolls inside its own box (overflow-x: auto), it never
     widens the page. Decorative backdrops (aria-hidden, clipped by their section) are not content. */
  const scrolls = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true; return false; };
  for (const e of document.querySelectorAll("main *")) {
    if (e.closest("[aria-hidden='true']") || scrolls(e)) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 0.5) { out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} runs past the window (right ${Math.round(r.right)} of ${vw})`); break; }
  }
  const h1 = document.querySelector("h1");
  if (h1 && h1.scrollWidth > h1.clientWidth + 1) out.push(`the h1 is wider than its box (${h1.scrollWidth} > ${h1.clientWidth})`);
  return out;
};

const ring = () => {
  const a = document.activeElement;
  const c = getComputedStyle(a);
  const shadow = c.boxShadow !== "none" && !/^(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px,? ?)+$/.test(c.boxShadow);
  return { tag: a.tagName, inBar: !!a.closest(".kz-site-bar"), outline: c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0, shadow };
};

const problems = [];
const browser = await chromium.launch();
try {
  for (const path of paths) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      for (const p of await page.evaluate(layoutProblems)) problems.push(`${path} @${width}: ${p}`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(base + path, { waitUntil: "networkidle" });
    const onLoad = await page.evaluate(ring);
    if (onLoad.inBar && (onLoad.outline || onLoad.shadow)) problems.push(`${path}: a bar link wears a focus ring on load`);
    const brand = page.locator(".kz-site-bar a").first();
    await brand.click();
    await page.waitForLoadState("networkidle");
    const clicked = await page.evaluate(ring);
    if (clicked.inBar && (clicked.outline || clicked.shadow)) problems.push(`${path}: the logo keeps a focus ring after a click`);
    await page.goto(base + path, { waitUntil: "networkidle" });
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(ring);
      if (!r.inBar) continue;
      if (!r.outline) problems.push(`${path}: a bar link has no focus ring for the keyboard`);
      if (r.outline && r.shadow) problems.push(`${path}: a bar link wears two focus rings (outline and shadow)`);
      break;
    }
    await page.close();
  }
} finally {
  await browser.close();
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check-layout: ${paths.length} pages × ${WIDTHS.join(", ")} px, bar and h1 inside the window; focus rings for the keyboard only`);
