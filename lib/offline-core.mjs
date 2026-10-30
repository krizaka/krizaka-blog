/* Reading offline (krizaka-blog#211): the part the page, the service worker and the tests share. Plain ESM (no types, no DOM),
   so the Workbox bundle of the service worker (scripts/sw-src.js) and the browser read the same code.

   The model: the service worker caches nothing by itself. A reader saves a chapter (or the series) on purpose; the saved pages and
   what they draw (scripts, styles, fonts, covers) go into ONE cache named `kz-saved-<build>`, the build being the hash of the
   chapters (offline-manifest.json, written at build). A new build means a new cache: the service worker re-saves what the reader
   had saved, then drops the old cache. Nothing is saved for the newsletter forms or the admin. */

export const SAVED_PREFIX = "kz-saved-";
export const MANIFEST_URL = "/offline-manifest.json";
export const CDN_ORIGIN = "https://krizaka-assets.b-cdn.net";
/** Below this share of the quota left, saving stops (the browser may evict the whole origin otherwise). */
export const QUOTA_USED_MAX = 0.8;

export const savedCacheName = (build) => `${SAVED_PREFIX}${build}`;

/** Pages that are never saved nor answered from the cache: the newsletter (forms, confirmation links) and the admin. */
export const isNeverCached = (pathname) => /^(\/fr)?\/(newsletter|admin|api)(\/|$)/.test(pathname);

/** The offline page of the language of a path: the one a reader lands on for a page that is not saved. */
export const offlineUrl = (pathname) => (/^\/fr(\/|$)/.test(pathname) ? "/fr/offline/" : "/offline/");

/** Whether the origin has room for more: false when the browser reports more than QUOTA_USED_MAX of the quota used. */
export function hasRoom(estimate) {
  if (!estimate?.quota) return true;
  return (estimate.usage ?? 0) / estimate.quota < QUOTA_USED_MAX;
}

/** Whether an error is the browser refusing to store more. */
export const isQuotaError = (e) => Boolean(e) && (e.name === "QuotaExceededError" || e.code === 22);

export async function readManifest(fetchFn) {
  const res = await fetchFn(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`offline manifest: ${res.status}`);
  return res.json();
}

/** Every chapter of the manifest, both languages. */
export const allEntries = (manifest) => Object.values(manifest.chapters).flat();

/** One file a chapter draws, kept when the cache lacks it. A cover that cannot be fetched is a missing picture, not a chapter that cannot be read: only the browser's refusal to store more stops the save. */
async function saveAsset(cache, asset, fetchFn) {
  if (await cache.match(asset)) return;
  try {
    const res = await fetchFn(asset, asset.startsWith("/") ? {} : { mode: "cors" });
    if (res.ok) await cache.put(asset, res);
  } catch (e) {
    if (isQuotaError(e)) throw e;
  }
}

/** One chapter: its page (which must be there), then what it draws. */
async function saveEntry(cache, entry, fetchFn) {
  const page = await fetchFn(entry.url, { credentials: "same-origin" });
  if (!page.ok) throw new Error(`${entry.url}: ${page.status}`);
  await cache.put(entry.url, page);
  for (const asset of entry.assets) await saveAsset(cache, asset, fetchFn);
}

/** Saves chapters (`entries`: { url, assets[] }) into the cache of the build: the page, then what it draws. Throws on a quota error. */
export async function saveEntries(cacheStorage, build, entries, fetchFn, onProgress = () => undefined) {
  const cache = await cacheStorage.open(savedCacheName(build));
  let done = 0;
  for (const entry of entries) {
    await saveEntry(cache, entry, fetchFn);
    done += 1;
    onProgress(done, entries.length);
  }
}

/** The page URLs saved on this device (the union of the `kz-saved-*` caches), as paths. */
export async function listSaved(cacheStorage, manifest) {
  const pages = new Set(allEntries(manifest).map((e) => e.url));
  const saved = new Set();
  for (const name of (await cacheStorage.keys()).filter((n) => n.startsWith(SAVED_PREFIX))) {
    for (const req of await (await cacheStorage.open(name)).keys()) {
      const path = new URL(req.url).pathname;
      if (pages.has(path)) saved.add(path);
    }
  }
  return [...saved];
}

/** Removes pages from every saved cache (their pictures and scripts stay: other saved chapters draw them). */
export async function removeSaved(cacheStorage, urls) {
  for (const name of (await cacheStorage.keys()).filter((n) => n.startsWith(SAVED_PREFIX))) {
    const cache = await cacheStorage.open(name);
    for (const url of urls) await cache.delete(url);
  }
}

/** A new build: re-saves the chapters the reader had saved from the new manifest, then drops the old caches. Returns the number re-saved. */
export async function migrate(cacheStorage, fetchFn) {
  const manifest = await readManifest(fetchFn);
  const target = savedCacheName(manifest.build);
  const old = (await cacheStorage.keys()).filter((n) => n.startsWith(SAVED_PREFIX) && n !== target);
  if (!old.length) return 0;
  const urls = await listSaved(cacheStorage, manifest);
  const entries = allEntries(manifest).filter((e) => urls.includes(e.url));
  await saveEntries(cacheStorage, manifest.build, entries, fetchFn);
  for (const name of old) await cacheStorage.delete(name);
  return entries.length;
}

/** The inline script that registers the service worker once the page is loaded (never in a preview build). */
export const REGISTER_SCRIPT =
  "if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}";
