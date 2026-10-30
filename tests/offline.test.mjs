// Reading offline (krizaka-blog#211): the shared core, the manifest written at build, the build check that every chapter can be saved.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  hasRoom,
  isNeverCached,
  listSaved,
  migrate,
  offlineUrl,
  removeSaved,
  saveEntries,
  savedCacheName,
} from "../lib/offline-core.mjs";
import { buildManifest, cssAssets, pageAssets, shellEntries } from "../scripts/offline.mjs";
import { offlineProblems } from "../scripts/check-offline.mjs";

/* A CacheStorage in memory: enough of the API for the core (open, keys, delete; match, put, keys, delete on a cache). */
function fakeCaches() {
  const store = new Map();
  const cache = (name) => ({
    async put(url, res) {
      store.get(name).set(String(url), res);
    },
    async match(url) {
      return store.get(name).get(String(url));
    },
    async delete(url) {
      return store.get(name).delete(String(url));
    },
    async keys() {
      return [...store.get(name).keys()].map((u) => ({ url: new URL(u, "https://blog.krizaka.com").href }));
    },
  });
  return {
    store,
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      return cache(name);
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name) {
      return store.delete(name);
    },
  };
}
const okFetch =
  (log = []) =>
  async (url) => {
    log.push(url);
    return { ok: true, status: 200, json: async () => ({}) };
  };
const entry = (slug, assets = []) => ({ slug, title: slug, url: `/story/${slug}/`, assets });

test("the newsletter, the admin and the api are never cached, in both languages", () => {
  for (const p of ["/newsletter/", "/fr/newsletter/confirmed/", "/admin/", "/api/x"]) assert.ok(isNeverCached(p), p);
  for (const p of ["/story/a/", "/fr/story/a/", "/offline/", "/newsletterish/"]) assert.ok(!isNeverCached(p), p);
});

test("a page that is not saved falls back to the offline page of its language", () => {
  assert.equal(offlineUrl("/story/a/"), "/offline/");
  assert.equal(offlineUrl("/fr/story/a/"), "/fr/offline/");
});

test("saving stops when the origin is over 80 % of its quota, and never blocks when the browser does not say", () => {
  assert.equal(hasRoom({ usage: 10, quota: 100 }), true);
  assert.equal(hasRoom({ usage: 85, quota: 100 }), false);
  assert.equal(hasRoom(undefined), true);
});

test("a saved chapter is cached with what it draws, once per file, in the cache of the build", async () => {
  const caches = fakeCaches();
  const log = [];
  const e1 = entry("a", ["/_next/static/x.js", "/_next/static/f.woff2"]);
  const e2 = entry("b", ["/_next/static/x.js"]);
  await saveEntries(caches, "b1", [e1, e2], okFetch(log));
  assert.deepEqual([...caches.store.keys()], [savedCacheName("b1")]);
  assert.equal(log.filter((u) => u === "/_next/static/x.js").length, 1, "a shared script is fetched once");
  const manifest = { build: "b1", chapters: { en: [e1, e2], fr: [] } };
  assert.deepEqual((await listSaved(caches, manifest)).sort(), ["/story/a/", "/story/b/"]);
  await removeSaved(caches, ["/story/a/"]);
  assert.deepEqual(await listSaved(caches, manifest), ["/story/b/"]);
});

test("a quota error stops the save and is reported; a missing cover does not", async () => {
  const caches = fakeCaches();
  const quota = async (url) => {
    if (url.endsWith(".webp")) throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
    return { ok: true };
  };
  await assert.rejects(saveEntries(caches, "b1", [entry("a", ["https://c/x.webp"])], quota), {
    name: "QuotaExceededError",
  });
  const missingCover = async (url) => {
    if (url.endsWith(".webp")) throw new TypeError("network");
    return { ok: true };
  };
  await saveEntries(caches, "b2", [entry("a", ["https://c/x.webp"])], missingCover);
});

test("a new build re-saves what the reader had saved and drops the old cache; one chapter removed from the site goes with it", async () => {
  const caches = fakeCaches();
  const old = { build: "old", chapters: { en: [entry("a"), entry("gone")], fr: [] } };
  await saveEntries(caches, "old", old.chapters.en, okFetch());
  const next = { build: "new", chapters: { en: [entry("a", ["/_next/static/n.js"]), entry("b")], fr: [] } };
  const log = [];
  const fetchFn = async (url, init) =>
    url === "/offline-manifest.json" ? { ok: true, json: async () => next } : okFetch(log)(url, init);
  assert.equal(await migrate(caches, fetchFn), 1);
  assert.deepEqual(await caches.keys(), [savedCacheName("new")]);
  assert.deepEqual(await listSaved(caches, next), ["/story/a/"], "b was never saved, gone is no longer published");
  assert.ok(log.includes("/_next/static/n.js"), "the new page's files are saved with it");
  assert.equal(await migrate(caches, fetchFn), 0, "nothing to do the second time");
});

test("pageAssets reads the files a page draws, not its metadata, its videos or its JSON-LD", () => {
  const html = `<html><head><meta property="og:image" content="https://krizaka-assets.b-cdn.net/og.png"/>
    <link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="canonical" href="https://blog.krizaka.com/_next/static/chunks/no.js"/>
    <script type="application/ld+json">{"image":"https://krizaka-assets.b-cdn.net/ld.webp"}</script></head>
    <body><script src="/_next/static/chunks/b.js"></script><img srcset="https://krizaka-assets.b-cdn.net/site/blog/c.1.avif 480w, https://krizaka-assets.b-cdn.net/site/blog/c.2.avif 768w"/>
    <video><source src="https://krizaka-assets.b-cdn.net/site/blog/v.mp4"/></video><p>/_next/static/chunks/%23n</p></body></html>`;
  assert.deepEqual(pageAssets(html).sort(), [
    "/_next/static/chunks/a.css",
    "/_next/static/chunks/b.js",
    "https://krizaka-assets.b-cdn.net/site/blog/c.1.avif",
    "https://krizaka-assets.b-cdn.net/site/blog/c.2.avif",
  ]);
});

test("cssAssets resolves the fonts a stylesheet draws against the stylesheet", () => {
  const css =
    '@font-face{src:url(../media/f.woff2) format("woff2")}a{background:url(data:image/png;base64,AA)}b{filter:url(%23n)}';
  assert.deepEqual(cssAssets(css, "/_next/static/chunks/a.css"), ["/_next/static/media/f.woff2"]);
});

/* A build in a folder: two chapters (one per language), the two offline pages, a stylesheet and its font. */
function fixture({ dropFont = false } = {}) {
  const out = mkdtempSync(join(tmpdir(), "offline-"));
  const put = (path, text) => {
    mkdirSync(join(out, path, ".."), { recursive: true });
    writeFileSync(join(out, path), text);
  };
  put("_next/static/chunks/a.css", "@font-face{src:url(../media/f.woff2)}");
  put("_next/static/chunks/a.js", "1");
  if (!dropFont) put("_next/static/media/f.woff2", "f");
  const page = (t) =>
    `<html><link rel="stylesheet" href="/_next/static/chunks/a.css"/><script src="/_next/static/chunks/a.js"></script><h1>${t}</h1></html>`;
  put("story/one/index.html", page("one"));
  put("fr/story/un/index.html", page("un"));
  put("offline/index.html", page("offline"));
  put("fr/offline/index.html", page("hors ligne"));
  return out;
}
const chapters = [
  { slug: "one", locale: "en", title: "One", chapter: 1 },
  { slug: "un", locale: "fr", title: "Un", chapter: 1 },
];
const fakeSw = (extra = "") =>
  `(()=>{var p=[{url:"/offline/",revision:"a"},{url:"/fr/offline/",revision:"b"},{url:"/offline-manifest.json",revision:"c"},{url:"/_next/static/chunks/a.js",revision:null}${extra}]})()`;

test("the manifest lists every chapter with its page, its script, its style and the font the style draws", () => {
  const out = fixture();
  const m = buildManifest(out, chapters);
  assert.equal(m.build.length, 12);
  assert.deepEqual(m.chapters.en[0].assets, [
    "/_next/static/chunks/a.css",
    "/_next/static/chunks/a.js",
    "/_next/static/media/f.woff2",
  ]);
  assert.equal(m.chapters.fr[0].url, "/fr/story/un/");
  assert.equal(buildManifest(out, chapters).build, m.build, "the same text is the same build");
  const shell = shellEntries(out, JSON.stringify(m)).map((e) => e.url);
  for (const u of ["/offline/", "/fr/offline/", "/offline-manifest.json", "/_next/static/media/f.woff2"])
    assert.ok(shell.includes(u), u);
});

test("the build check passes when every chapter can be saved and the worker precache is complete", () => {
  const out = fixture();
  writeFileSync(join(out, "offline-manifest.json"), JSON.stringify(buildManifest(out, chapters)));
  writeFileSync(join(out, "sw.js"), fakeSw());
  assert.deepEqual(offlineProblems(out, chapters), []);
});

test("the build check names a chapter missing from the manifest, a file that is not in the build and a worker that cannot load", () => {
  const out = fixture({ dropFont: true });
  const manifest = buildManifest(out, chapters);
  manifest.chapters.fr = [];
  writeFileSync(join(out, "offline-manifest.json"), JSON.stringify(manifest));
  writeFileSync(join(out, "sw.js"), `import {x} from "y";\nself.__WB_MANIFEST;[{url:"/offline/"}]`);
  const problems = offlineProblems(out, chapters).join("\n");
  assert.match(problems, /chapter fr\/un is not in offline-manifest\.json/);
  assert.match(problems, /f\.woff2 is listed but not in the build/);
  assert.match(problems, /sw\.js is not a bundled classic script/);
  assert.match(problems, /sw\.js does not precache \/fr\/offline\//);
});

test("the build check refuses the newsletter in the manifest or in the precache", () => {
  const out = fixture();
  const manifest = buildManifest(out, chapters);
  manifest.chapters.en.push({ slug: "x", title: "x", url: "/newsletter/", assets: [] });
  writeFileSync(join(out, "offline-manifest.json"), JSON.stringify(manifest));
  writeFileSync(join(out, "sw.js"), fakeSw(',{url:"/fr/newsletter/",revision:"z"}'));
  const problems = offlineProblems(out, chapters).join("\n");
  assert.match(problems, /\/newsletter\/: the newsletter and the admin are never saved/);
  assert.match(problems, /sw\.js precaches \/fr\/newsletter\/, which is never cached/);
});

test("the worker source never opens a cache of its own for pages: it answers from what was saved", () => {
  const src = readFileSync(new URL("../scripts/sw-src.js", import.meta.url), "utf8");
  assert.ok(!/caches\.open\(/.test(src), "only the reader's save writes pages");
  assert.match(src, /isNeverCached/);
});
