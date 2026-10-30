#!/usr/bin/env node
/* Reading offline, checked on the built site (krizaka-blog#211): every published chapter, in both languages, is in
   offline-manifest.json with its page and every file it draws on disk; the service worker is one classic script (no `import`), carries
   the offline pages and the manifest in its precache and every precached file exists; nothing of the newsletter or the admin is
   listed. A chapter that cannot be saved, or a worker that cannot load, fails the build.
   Usage: node scripts/check-offline.mjs (reads ./out) */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CDN_ORIGIN, isNeverCached } from "../lib/offline-core.mjs";
import { readEntries } from "./postbuild.mjs";

const onDisk = (out, url) => join(out, decodeURIComponent(url.split("?")[0]));

/** What the manifest says of one published chapter against the build: its entry, its page, every file it draws. */
function chapterProblems(out, manifest, c) {
  const entry = (manifest.chapters[c.locale] ?? []).find((e) => e.slug === c.slug);
  if (!entry) return [`chapter ${c.locale}/${c.slug} is not in offline-manifest.json`];
  const problems = [];
  if (!existsSync(join(out, entry.url, "index.html"))) problems.push(`${entry.url}: the page is not in the build`);
  for (const a of entry.assets.filter((f) => !f.startsWith(CDN_ORIGIN)))
    if (!existsSync(onDisk(out, a))) problems.push(`${entry.url}: ${a} is listed but not in the build`);
  return problems;
}

/** What the manifest lists that it should not: the newsletter and the admin, or a page that is not a published chapter. */
function strayProblems(manifest, chapters) {
  const problems = [];
  for (const [locale, entries] of Object.entries(manifest.chapters))
    for (const e of entries) {
      if (isNeverCached(e.url)) problems.push(`${e.url}: the newsletter and the admin are never saved`);
      if (!chapters.some((c) => c.locale === locale && c.slug === e.slug))
        problems.push(`${e.url}: listed in offline-manifest.json but not a published chapter`);
    }
  return problems;
}

/** The worker: one classic script, whose precache holds the offline pages and the manifest, every file there and nothing never cached. */
function workerProblems(out, sw) {
  const problems = [];
  if (/^\s*import[\s{]/m.test(sw) || sw.includes("__WB_MANIFEST"))
    problems.push("sw.js is not a bundled classic script");
  const precached = [...sw.matchAll(/url"?:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const need of ["/offline/", "/fr/offline/", "/offline-manifest.json"])
    if (!precached.includes(need)) problems.push(`sw.js does not precache ${need}`);
  for (const url of precached) {
    if (isNeverCached(url)) problems.push(`sw.js precaches ${url}, which is never cached`);
    if (!existsSync(onDisk(out, url.endsWith("/") ? join(url, "index.html") : url)))
      problems.push(`sw.js precaches ${url}, which is not in the build`);
  }
  return problems;
}

/** The problems of a build's offline files against the published chapters (empty when every chapter can be saved and read). */
export function offlineProblems(out, chapters) {
  const manifestPath = join(out, "offline-manifest.json");
  const swPath = join(out, "sw.js");
  if (!existsSync(manifestPath)) return ["offline-manifest.json is missing"];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const problems = [
    ...(manifest.build ? [] : ["offline-manifest.json has no build id"]),
    ...chapters.flatMap((c) => chapterProblems(out, manifest, c)),
    ...strayProblems(manifest, chapters),
  ];
  if (!existsSync(swPath)) return [...problems, "sw.js is missing"];
  return [...problems, ...workerProblems(out, readFileSync(swPath, "utf8"))];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = "out";
  const root = fileURLToPath(new URL("..", import.meta.url));
  const show = process.env.APP_SHOW_DRAFTS === "1";
  const chapters = readEntries(join(root, "content/chapters"), show);
  const problems = offlineProblems(out, chapters);
  if (problems.length) {
    console.error(problems.map((p) => `offline: ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`offline: ${chapters.length} chapters in the manifest, sw.js precache complete`);
}
