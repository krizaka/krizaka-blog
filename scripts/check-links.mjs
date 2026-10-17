#!/usr/bin/env node
/* Every link of the blog answers. Crawls a running site from its home pages (EN and FR), its feeds and its sitemap, reads
   every href / src / srcset / poster / <link> / feed <link>, and checks:
   - internal links (same origin, or https://blog.krizaka.com/… mapped onto --base): must answer 2xx. A 3xx is followed
     (up to 10 hops; a loop or a dead end fails). Any failure exits 1: the build is refused.
   - external links (--external): HEAD, then GET when HEAD is refused, with retries and backoff. A host of SOFT_HOSTS
     (they refuse robots: 401/403/429/999) is reported but never fails. Anything else that is not 2xx/3xx fails.
   Usage: node scripts/check-links.mjs --base http://localhost:3000 [--external] [--host https://blog.krizaka.com]
   The pure helpers are exported for tests/links.test.mjs. */
import { pathToFileURL } from "node:url";

/** Hosts that answer robots with 401/403/429/999 whatever the link: reported, never fatal. Keep this list short. */
export const SOFT_HOSTS = ["www.linkedin.com", "linkedin.com", "x.com", "twitter.com", "www.reddit.com", "reddit.com", "news.ycombinator.com", "www.facebook.com", "www.mastercard.us", "www.mastercard.com", "usa.visa.com", "www.visa.ca", "www.paypal.com"];
/** Schemes and targets that are not fetched. */
const SKIP = /^(mailto:|tel:|javascript:|data:|#)/i;

/** Every URL a page names: href, src, srcset (each candidate), poster, content of og:image/twitter:image. */
export function extractLinks(html) {
  const out = new Set();
  const attr = /\s(href|src|poster|srcset|content)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = attr.exec(html))) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? "").replace(/&amp;/g, "&").trim();
    if (!value) continue;
    if (name === "srcset") {
      for (const part of value.split(",")) {
        const u = part.trim().split(/\s+/)[0];
        if (u) out.add(u);
      }
    } else if (name === "content") {
      if (/^https?:\/\//.test(value) && !/\s/.test(value)) out.add(value);
    } else out.add(value);
  }
  /* Feeds (RSS <link>…</link>, Atom <link href>) and sitemaps (<loc>). */
  for (const x of html.matchAll(/<(?:link|loc|id)>\s*(https?:\/\/[^<\s]+)\s*<\/(?:link|loc|id)>/g)) out.add(x[1]);
  return [...out].filter((u) => !SKIP.test(u));
}

/** Resolves a link found on `from`; maps the production host onto the base so the build is what is checked. */
export function resolve(link, from, base, host) {
  let u;
  try {
    u = new URL(link, from);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (host && u.origin === new URL(host).origin) u = new URL(u.pathname + u.search, base);
  u.hash = "";
  return u.toString();
}

export const isInternal = (url, base) => new URL(url).origin === new URL(base).origin;
export const isSoft = (url) => SOFT_HOSTS.includes(new URL(url).hostname);
const isPage = (url, type) => /text\/html|xml/.test(type ?? "") || /\/$|\.html$|\.xml$/.test(new URL(url).pathname);

/** Follows redirects by hand: the final status, or `loop` / `too many`. */
export async function follow(url, { method = "GET", fetchImpl = fetch, timeout = 15000, max = 10 } = {}) {
  const seen = new Set();
  let current = url;
  for (let hop = 0; hop <= max; hop++) {
    if (seen.has(current)) return { url, status: 0, error: `redirect loop at ${current}` };
    seen.add(current);
    const res = await fetchImpl(current, { method, redirect: "manual", signal: AbortSignal.timeout(timeout), headers: { "User-Agent": "krizaka-blog-link-check (+https://github.com/krizaka/krizaka-blog)", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    return { url, status: res.status, final: current, type: res.headers.get("content-type"), body: method === "GET" ? res : null };
  }
  return { url, status: 0, error: `more than ${max} redirects` };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** An external link: HEAD, then GET if HEAD is refused; three tries with backoff on network errors, 429 and 5xx.
    `transient` is true when the last answer could be the network's or the host's mood (timeout, reset, 429, 5xx): reported,
    not fatal. A 4xx, an unknown host or a redirect loop is broken. */
export async function checkExternal(url, { fetchImpl = fetch, tries = 3, wait = 1500 } = {}) {
  let last = { url, status: 0, error: "not tried" };
  for (let i = 0; i < tries; i++) {
    try {
      last = await follow(url, { method: "HEAD", fetchImpl });
      if (!last.error && [400, 403, 404, 405, 501].includes(last.status)) last = await follow(url, { method: "GET", fetchImpl });
      if (last.body) await last.body.body?.cancel?.().catch(() => {});
      if (last.error) return { ...last, transient: false };
      if (last.status < 400) return { ...last, transient: false };
      if (last.status !== 429 && last.status < 500) return { ...last, transient: false };
    } catch (e) {
      const code = e.cause?.code ?? e.message;
      last = { url, status: 0, error: e.name === "TimeoutError" ? "timeout" : code };
      if (code === "ENOTFOUND") return { ...last, transient: false };
    }
    if (i < tries - 1) await sleep(wait * (i + 1));
  }
  return { ...last, transient: true };
}

async function crawl({ base, host, external }) {
  const start = ["/", "/fr/", "/feed.xml", "/atom.xml", "/fr/feed.xml", "/fr/atom.xml", "/sitemap.xml", "/llms.txt", "/404.html"].map((p) => new URL(p, base).toString());
  const queue = [...start];
  const seen = new Set(queue);
  const where = new Map(start.map((u) => [u, "(start)"]));
  const externals = new Map();
  const failures = [];
  while (queue.length) {
    const url = queue.shift();
    let r;
    try {
      r = await follow(url);
    } catch (e) {
      failures.push(`${url} — ${e.message} (linked from ${where.get(url)})`);
      continue;
    }
    if (r.error || r.status < 200 || r.status >= 300) {
      failures.push(`${url} — ${r.error ?? r.status} (linked from ${where.get(url)})`);
      await r.body?.body?.cancel?.().catch(() => {});
      continue;
    }
    if (!isInternal(r.final, base) || !(isPage(r.final, r.type) || r.final.endsWith(".txt"))) {
      await r.body?.body?.cancel?.().catch(() => {});
      continue;
    }
    const text = await r.body.text();
    for (const link of extractLinks(text)) {
      const u = resolve(link, r.final, base, host);
      if (!u) continue;
      if (isInternal(u, base)) {
        if (!seen.has(u)) {
          seen.add(u);
          where.set(u, url);
          queue.push(u);
        }
      } else if (!externals.has(u)) externals.set(u, url);
    }
    for (const x of text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      const u = resolve(x[1], r.final, base, host);
      if (u && !isInternal(u, base) && !externals.has(u)) externals.set(u, url);
    }
  }
  console.log(`check-links: ${seen.size} internal URLs, ${failures.length} broken`);
  const soft = [];
  if (external) {
    const list = [...externals.keys()];
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const u = list[i++];
        const r = await checkExternal(u);
        const ok = !r.error && r.status >= 200 && r.status < 400;
        if (ok) continue;
        const line = `${u} — ${r.error ?? r.status} (linked from ${externals.get(u)})`;
        if (isSoft(u) || r.transient) soft.push(line);
        else failures.push(line);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    console.log(`check-links: ${list.length} external URLs checked`);
  }
  for (const s of soft) console.log(`not fatal (host refuses robots, or a transient answer after retries): ${s}`);
  for (const f of failures) console.error(`BROKEN ${f}`);
  return failures.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const base = arg("--base", "http://localhost:3000");
  const host = arg("--host", "https://blog.krizaka.com");
  const external = process.argv.includes("--external");
  const broken = await crawl({ base, host, external });
  process.exit(broken ? 1 : 0);
}
