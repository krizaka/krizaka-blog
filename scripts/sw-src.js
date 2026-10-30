/* The service worker (krizaka-blog#211), bundled by Workbox (scripts/offline.mjs → out/sw.js). It caches nothing by itself:
   - precache (Workbox): the two offline pages, what they draw, and the build's manifest — versioned by Workbox's revisions;
   - a navigation goes to the network; when it fails or is slow, to the chapter the reader saved, then to the offline page;
   - scripts, styles, fonts and covers are read from what was saved, else from the network (never stored here);
   - the newsletter and the admin are never touched (lib/offline-core.mjs isNeverCached);
   - a new build re-saves what the reader had saved, then drops the old cache (migrate). */
import { matchPrecache, precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CDN_ORIGIN, isNeverCached, migrate, offlineUrl } from "../lib/offline-core.mjs";

const NETWORK_TIMEOUT_MS = 4000;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      try {
        await migrate(self.caches, (url, init) => fetch(url, init));
      } catch {
        // offline at the update: the old cache stays, the next activation tries again
      }
    })(),
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" && url.origin === self.location.origin && !isNeverCached(url.pathname),
  async ({ request, url }) => {
    try {
      return await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]);
    } catch {
      return (
        (await self.caches.match(request, { ignoreSearch: true })) ??
        (await matchPrecache(offlineUrl(url.pathname))) ??
        Response.error()
      );
    }
  },
);

registerRoute(
  ({ request, url }) =>
    request.method === "GET" &&
    ((url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) || url.origin === CDN_ORIGIN),
  async ({ request }) => (await self.caches.match(request)) ?? fetch(request),
);
