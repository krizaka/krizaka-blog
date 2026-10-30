#!/usr/bin/env node
/* After `next build` (krizaka-blog#211): reading offline. Writes out/offline-manifest.json — every published chapter, its page and
   what the page draws (scripts, styles, fonts, covers), read from the exported HTML — and out/sw.js, the service worker, bundled
   by Workbox (MIT, workbox-build) from scripts/sw-src.js with the offline pages in its precache. The build id is the hash of the
   chapters' pages: a new text is a new cache on the readers' devices (lib/offline-core.mjs). A preview build has none. */
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { CDN_ORIGIN } from "../lib/offline-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* Files a page draws, by extension: scripts, styles, fonts and pictures. The videos are left out (large; their poster is kept). */
const FILE = /^[^"'\s\\)<>,]+\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|gif)/;
/** The files that follow each occurrence of `prefix` in `text` (a string search: no pattern is built from a URL). */
const filesAfter = (text, prefix) =>
  text
    .split(prefix)
    .slice(1)
    .map((rest) => rest.match(FILE)?.[0])
    .filter(Boolean)
    .map((f) => prefix + f);

/** The files a page draws: Next's static files and the CDN's pictures, found in its HTML (the metadata and the JSON-LD left out). */
export function pageAssets(html) {
  const body = html
    .replace(/<meta\b[^>]*>/g, "")
    .replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/g, "")
    .replace(/<link\b[^>]*rel="(?:canonical|alternate|manifest|icon|apple-touch-icon)"[^>]*>/g, "");
  return [...new Set([...filesAfter(body, "/_next/static/"), ...filesAfter(body, `${CDN_ORIGIN}/`)])];
}

/** The fonts and files a stylesheet draws (`url(../media/x.woff2)`), as absolute paths. */
export function cssAssets(css, cssPath) {
  const out = new Set();
  for (const m of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
    if (/^(data:|https?:|#|%23)/.test(m[1])) continue;
    out.add(m[1].startsWith("/") ? m[1] : posix.join(posix.dirname(cssPath), m[1]));
  }
  return [...out];
}

const pathOnDisk = (out, url) => join(out, decodeURIComponent(url.split("?")[0]));

/** Adds to `assets` what the stylesheets among them draw (the fonts). */
function withStyleAssets(out, assets) {
  for (const a of [...assets])
    if (a.endsWith(".css") && existsSync(pathOnDisk(out, a)))
      for (const f of cssAssets(readFileSync(pathOnDisk(out, a), "utf8"), a)) assets.add(f);
  return assets;
}

/** A chapter's entry: its URL, title and every file the reader needs to read it with no network. */
export function chapterEntry(out, c) {
  const url = `${c.locale === "fr" ? "/fr" : ""}/story/${c.slug}/`;
  const html = readFileSync(join(out, url, "index.html"), "utf8");
  const assets = withStyleAssets(out, new Set(pageAssets(html)));
  return { entry: { slug: c.slug, title: c.title, url, assets: [...assets].sort() }, hash: sha(html) };
}

/** offline-manifest.json: the build id and the chapters per language, in reading order. */
export function buildManifest(out, chapters) {
  const hashes = [];
  const byLocale = { en: [], fr: [] };
  for (const c of [...chapters].sort((a, b) => a.chapter - b.chapter)) {
    const { entry, hash } = chapterEntry(out, c);
    byLocale[c.locale].push(entry);
    hashes.push(hash);
  }
  return { build: sha(hashes.join("")).slice(0, 12), chapters: byLocale };
}

/** The offline pages and the files they draw, for Workbox's precache (the same-origin ones; revision null = hashed file name). */
export function shellEntries(out, manifestJson) {
  const entries = [{ url: "/offline-manifest.json", revision: sha(manifestJson).slice(0, 12) }];
  const files = new Set();
  for (const url of ["/offline/", "/fr/offline/"]) {
    const html = readFileSync(join(out, url, "index.html"), "utf8");
    entries.push({ url, revision: sha(html).slice(0, 12) });
    for (const f of withStyleAssets(out, new Set(pageAssets(html)))) if (f.startsWith("/")) files.add(f);
  }
  return [...entries, ...[...files].sort().map((url) => ({ url, revision: null }))];
}

export async function writeOffline(out, chapters) {
  const manifest = buildManifest(out, chapters);
  const json = JSON.stringify(manifest);
  writeFileSync(join(out, "offline-manifest.json"), json);
  const { injectManifest } = await import("workbox-build");
  const { build } = await import("esbuild");
  /* Workbox injects the precache list but does not bundle the worker's imports: esbuild does, to one classic script. */
  const bundled = join(mkdtempSync(join(tmpdir(), "sw-")), "sw.js");
  await build({
    entryPoints: [join(root, "scripts/sw-src.js")],
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2020",
    outfile: bundled,
    logLevel: "warning",
  });
  const { count, size, warnings } = await injectManifest({
    swSrc: bundled,
    swDest: join(out, "sw.js"),
    globDirectory: out,
    globPatterns: [],
    additionalManifestEntries: shellEntries(out, json),
  });
  for (const w of warnings) console.warn(`offline: ${w}`);
  const n = Object.values(manifest.chapters).flat().length;
  console.log(`offline: build ${manifest.build}, ${n} chapters saveable, sw.js precaches ${count} files (${size} B)`);
}
