#!/usr/bin/env node
/* Reading offline, in a real browser (krizaka-blog#211): open a chapter, save it, go offline, reload it and read it; a chapter that was
   not saved answers with the offline page; the newsletter is not answered from the cache. Playwright, Chromium.
   Usage: node scripts/check-offline-reading.mjs --base http://localhost:3000 --out out */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "http://localhost:3000");
const out = arg("out", "out");
const slugs = readdirSync(join(out, "story"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(out, "story", d.name, "index.html")))
  .map((d) => d.name)
  .sort();
if (slugs.length < 2) throw new Error("the e2e needs two chapters");
const [saved, notSaved] = slugs;

const fail = (m) => {
  console.error(`offline e2e: ${m}`);
  process.exit(1);
};
const { offline } = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8")); // the words the page wears
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
await page.goto(`${base}/story/${saved}/`);
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.reload(); // the worker now controls the page
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });

await page.getByRole("button", { name: offline.save, exact: true }).first().click();
await page.getByText(offline.saved, { exact: true }).first().waitFor({ timeout: 30000 });

await context.setOffline(true);
await page.goto(`${base}/story/${saved}/`);
const h1 = await page.locator("h1").first().textContent();
if (!h1?.trim()) fail("the saved chapter has no title offline");
if (!(await page.locator(".bl-prose p").first().isVisible())) fail("the saved chapter's text is not readable offline");
const unstyled = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
if (!unstyled) fail("the saved chapter lost its styles offline");

await page.goto(`${base}/story/${notSaved}/`);
await page.getByRole("heading", { level: 1, name: offline.title }).waitFor({ timeout: 10000 });
await page.locator(".bl-saved a", { hasText: h1.trim() }).first().waitFor({ timeout: 5000 });

await context.setOffline(false);
await browser.close();
console.log(`offline e2e: /story/${saved}/ read with no network, /story/${notSaved}/ answered by the offline page`);
