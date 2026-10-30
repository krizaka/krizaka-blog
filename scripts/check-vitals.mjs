#!/usr/bin/env node
/* Core Web Vitals budget, in a real browser (Playwright, Chromium, a phone-sized window, throttled CPU): the Largest Contentful
   Paint and the Cumulative Layout Shift of the home, a post and a chapter, in both languages, stay under scripts/vitals-budget.json.
   The budget only goes down: raising it is a review decision, never a way to get a build green.
   Usage: node scripts/check-vitals.mjs --base http://localhost:3000 [--posts out] */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const BUDGET = JSON.parse(readFileSync(new URL("./vitals-budget.json", import.meta.url), "utf8"));

/** The problems of one page's measures against the budget (empty when it holds). */
export function vitalsProblems(path, metrics, budget = BUDGET) {
  const out = [];
  if (!(metrics.lcp > 0)) out.push(`${path}: no Largest Contentful Paint was reported`);
  else if (metrics.lcp > budget.lcpMs)
    out.push(`${path}: LCP ${Math.round(metrics.lcp)} ms is over the ${budget.lcpMs} ms budget`);
  if (!(metrics.cls <= budget.cls)) out.push(`${path}: CLS ${metrics.cls.toFixed(3)} is over the ${budget.cls} budget`);
  return out;
}

/** The pages measured: the home in both languages, then the first post and the first chapter found in the build output. */
export function pagesToMeasure(postsDir) {
  const paths = ["/", "/fr/"];
  if (!postsDir) return paths;
  for (const prefix of ["", "fr/"])
    for (const section of ["basics", "story"]) {
      const dir = join(postsDir, prefix, section);
      if (!existsSync(dir)) continue;
      const slug = readdirSync(dir).find((s) => existsSync(join(dir, s, "index.html")));
      if (slug) paths.push(`/${prefix}${section}/${slug}/`);
    }
  return paths;
}

/** Runs in the page: observes LCP and layout shifts (those without recent input) until read. */
const observe = () => {
  window.__vitals = { lcp: 0, cls: 0 };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
};

async function main() {
  const { chromium } = await import("playwright");
  const args = process.argv.slice(2);
  const base = (args[args.indexOf("--base") + 1] || "http://localhost:3000").replace(/\/$/, "");
  const postsDir = args.includes("--posts") ? args[args.indexOf("--posts") + 1] : undefined;
  const browser = await chromium.launch();
  const problems = [];
  try {
    for (const path of pagesToMeasure(postsDir)) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: BUDGET.cpuThrottle });
      await page.addInitScript(observe);
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForTimeout(BUDGET.settleMs);
      const metrics = await page.evaluate(() => window.__vitals);
      console.log(`${path}  LCP ${Math.round(metrics.lcp)} ms  CLS ${metrics.cls.toFixed(3)}`);
      problems.push(...vitalsProblems(path, metrics));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("Core Web Vitals: every page holds the budget");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
