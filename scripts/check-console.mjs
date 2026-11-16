#!/usr/bin/env node
/* The browser console of the home and of one chapter stays clean (krizaka-internal#3975): no CORS refusal (the CDN must answer an AVIF fetched
   in CORS mode, e.g. by the service worker or the cover preload) and no « preloaded using link preload but not used ». Playwright, Chromium.
   Usage: node scripts/check-console.mjs --base http://localhost:3000 --out out */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { refused } from "./console-refused.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "http://localhost:3000");
const out = arg("out", "out");
const chapter = readdirSync(join(out, "story"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(out, "story", d.name, "index.html")))
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b))[0];

const browser = await chromium.launch();
const problems = [];
for (const path of ["/", `/story/${chapter}/`]) {
  const page = await (await browser.newContext()).newPage();
  const seen = [];
  page.on("console", (m) => seen.push(m.text()));
  page.on("pageerror", (e) => seen.push(String(e)));
  page.on("requestfailed", (r) => seen.push(`${r.failure()?.errorText ?? "failed"} ${r.url()}`));
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(4000); // the preload warning comes a few seconds after load
  for (const text of seen.filter(refused)) problems.push(`${path}: ${text}`);
  await page.context().close();
}
await browser.close();
if (problems.length) {
  console.error(`console check: ${problems.length} refused message(s)\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`console check: / and /story/${chapter}/ have no CORS error and no unused preload`);
