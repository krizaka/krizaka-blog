#!/usr/bin/env node
/* The layout the reader sees, in a real browser (Playwright, Chromium): at 1750, 1366, 390 and 360 px the bar and the page's h1
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
/* --posts <out dir>: every post and every chapter the build wrote, in both languages (out/basics/<slug>/, out/fr/story/<slug>/…). */
const postsDir = args.includes("--posts") ? args[args.indexOf("--posts") + 1] : undefined;
if (postsDir) {
  for (const prefix of ["", "fr/"])
    for (const section of ["basics", "story"]) {
      const dir = join(postsDir, prefix, section);
      if (existsSync(dir))
        for (const slug of readdirSync(dir))
          if (existsSync(join(dir, slug, "index.html"))) paths.push(`/${prefix}${section}/${slug}/`);
    }
}
const WIDTHS = [1750, 1366, 390, 360];

/* The problems of one page as laid out, in small checks: each runs in the browser by itself (page.evaluate serialises one function),
   so none reads another. */
const sidewaysScroll = () => {
  const vw = document.documentElement.clientWidth;
  const wide = document.documentElement.scrollWidth > vw || document.body.scrollWidth > vw;
  return wide ? [`the page scrolls sideways (${document.body.scrollWidth} > ${vw})`] : [];
};

/** The bar and the title: boxes past the right or left edge. */
const chromePastEdge = () => {
  const vw = document.documentElement.clientWidth;
  const label = (e) => (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 40);
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && getComputedStyle(e).visibility !== "hidden";
  };
  return [...document.querySelectorAll("h1, .kz-site-bar, .kz-site-bar a, .kz-site-bar button")]
    .filter(visible)
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.left < -0.5 || r.right > vw + 0.5)
    .map(
      ({ e, r }) =>
        `${e.tagName.toLowerCase()} "${label(e)}" runs past the window (${Math.round(r.left)}–${Math.round(r.right)} of ${vw})`,
    );
};

/* Nothing of the content past the right edge: a wide table or code block scrolls inside its own box (overflow-x: auto), it never
   widens the page. Decorative backdrops (aria-hidden, clipped by their section) are not content. */
const contentPastEdge = () => {
  const vw = document.documentElement.clientWidth;
  const scrolls = (e) => {
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement)
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
    return false;
  };
  const past = [...document.querySelectorAll("main *")].find((e) => {
    if (e.closest("[aria-hidden='true']") || scrolls(e)) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > vw + 0.5;
  });
  return past
    ? [
        `${past.tagName.toLowerCase()}.${String(past.className).split(" ")[0]} runs past the window (right ${Math.round(past.getBoundingClientRect().right)} of ${vw})`,
      ]
    : [];
};

const titleOverflow = () => {
  const h1 = document.querySelector("h1");
  return h1 && h1.scrollWidth > h1.clientWidth + 1
    ? [`the h1 is wider than its box (${h1.scrollWidth} > ${h1.clientWidth})`]
    : [];
};

const LAYOUT_CHECKS = [sidewaysScroll, chromePastEdge, contentPastEdge, titleOverflow];

const ring = () => {
  const a = document.activeElement;
  const c = getComputedStyle(a);
  const shadow = c.boxShadow !== "none" && !/^(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px,? ?)+$/.test(c.boxShadow);
  return {
    tag: a.tagName,
    inBar: !!a.closest(".kz-site-bar"),
    outline: c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0,
    shadow,
  };
};

const problems = [];
const browser = await chromium.launch();
try {
  for (const path of paths) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      for (const check of LAYOUT_CHECKS)
        for (const p of await page.evaluate(check)) problems.push(`${path} @${width}: ${p}`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(base + path, { waitUntil: "networkidle" });
    const onLoad = await page.evaluate(ring);
    if (onLoad.inBar && (onLoad.outline || onLoad.shadow))
      problems.push(`${path}: a bar link wears a focus ring on load`);
    const brand = page.locator(".kz-site-bar a").first();
    await brand.click();
    await page.waitForLoadState("networkidle");
    const clicked = await page.evaluate(ring);
    if (clicked.inBar && (clicked.outline || clicked.shadow))
      problems.push(`${path}: the logo keeps a focus ring after a click`);
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
console.log(
  `check-layout: ${paths.length} pages × ${WIDTHS.join(", ")} px, bar and h1 inside the window; focus rings for the keyboard only`,
);
