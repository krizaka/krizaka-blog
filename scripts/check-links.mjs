#!/usr/bin/env node
/* Every link of the blog answers. Crawls a running site from its home pages (EN and FR), its feeds and its sitemap, reads
   every href / src / srcset / poster / <link> / feed <link>, and checks:
   - internal links (same origin, or https://blog.krizaka.com/… mapped onto --base): must answer 2xx. A 3xx is followed
     (up to 10 hops; a loop or a dead end fails). Any failure exits 1: the build is refused.
   - external links (--external): HEAD, then GET when HEAD is refused, with retries and backoff. A host of SOFT_HOSTS
     (they refuse robots: 401/403/429/999) is reported but never fails. Anything else that is not 2xx/3xx fails.
   Usage: node scripts/check-links.mjs --base http://localhost:3000 [--external] [--host https://blog.krizaka.com]
   The pure helpers are exported for tests/links.test.mjs. */
import { publicRepoUrl, siteUrl } from "../lib/links.ts";
import { pathToFileURL } from "node:url";

/** Hosts that answer robots with 401/403/429/999 whatever the link: reported, never fatal. Keep this list short. */
export const SOFT_HOSTS = [
  "www.linkedin.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "www.reddit.com",
  "reddit.com",
  "news.ycombinator.com",
  "www.facebook.com",
  "www.mastercard.us",
  "www.mastercard.com",
  "usa.visa.com",
  "www.visa.ca",
  "www.paypal.com",
  "opensource.org",
];
/** Schemes and targets that are not fetched: other schemes, fragments, and the paths the CDN's edge injects on the live
    site (Cloudflare's e-mail obfuscation rewrites a mailto: into /cdn-cgi/l/email-protection#…, decoded by its script). */
const SKIP = /(?:^(?:mailto:|tel:|javascript:|data:|#)|\/cdn-cgi\/)/i;

/** The entities React writes in attributes (&amp; &quot; &#x27; &#39; …), decoded. */
export const decodeEntities = (v) =>
  v
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

/** The URLs of a srcset, read as the HTML spec reads them: a URL runs to the next whitespace (a data: URL keeps its
    comma), then its descriptor runs to the next comma. */
export function srcsetUrls(value) {
  const urls = [];
  const skipWhile = (from, test) => {
    let k = from;
    while (k < value.length && test(value[k])) k++;
    return k;
  };
  let i = 0;
  while (i < value.length) {
    i = skipWhile(i, (c) => /[\s,]/.test(c));
    const j = skipWhile(i, (c) => !/\s/.test(c));
    const raw = value.slice(i, j);
    let end = raw.length;
    while (end > 0 && raw[end - 1] === ",") end--;
    const url = raw.slice(0, end);
    if (url) urls.push(url);
    i = raw.endsWith(",") ? j : skipWhile(j, (c) => c !== ",");
  }
  return urls;
}

/** Every URL a page names: href, src, srcset (each candidate), poster, content of og:image/twitter:image. */
export function extractLinks(html) {
  const out = new Set();
  /* Resource hints name an origin to warm up, not a page or a file: their href is not checked. */
  html = html.replace(/<link\b[^>]*\brel\s*=\s*["'](?:preconnect|dns-prefetch)["'][^>]*>/gi, "");
  const attr = /\s(href|src|poster|srcset|content)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = attr.exec(html))) {
    const name = m[1].toLowerCase();
    const value = decodeEntities(m[3] ?? m[4] ?? "").trim();
    if (!value) continue;
    if (name === "srcset") for (const u of srcsetUrls(value)) out.add(u);
    else if (name === "content") {
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
/** A document whose links are followed: HTML, a feed, a sitemap — not an XSLT stylesheet, whose `{link}` are templates
    filled in by the browser (the stylesheet itself is still checked: it must answer). */
export const isPage = (url, type) => {
  const path = new URL(url).pathname;
  if (/\.xslt?$/.test(path) || /xsl/.test(type ?? "")) return false;
  return /text\/html|xml/.test(type ?? "") || /\/$|\.html$|\.xml$/.test(path);
};

/** Follows redirects by hand: the final status, or `loop` / `too many`. */
export async function follow(url, { method = "GET", fetchImpl = fetch, timeout = 15000, max = 10 } = {}) {
  const seen = new Set();
  let current = url;
  for (let hop = 0; hop <= max; hop++) {
    if (seen.has(current)) return { url, status: 0, error: `redirect loop at ${current}` };
    seen.add(current);
    const res = await fetchImpl(current, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeout),
      headers: {
        "User-Agent": `krizaka-blog-link-check (+${publicRepoUrl("krizaka-blog")})`,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    return {
      url,
      status: res.status,
      final: current,
      type: res.headers.get("content-type"),
      body: method === "GET" ? res : null,
    };
  }
  return { url, status: 0, error: `more than ${max} redirects` };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FALLBACK_TO_GET = new Set([400, 403, 404, 405, 501]);

async function probeExternal(url, fetchImpl) {
  let result = await follow(url, { method: "HEAD", fetchImpl });
  if (!result.error && FALLBACK_TO_GET.has(result.status)) {
    result = await follow(url, { method: "GET", fetchImpl });
  }
  if (result.body) {
    await result.body.body?.cancel?.().catch(() => {});
  }
  return result;
}

function isFinalExternalResult(result) {
  return Boolean(result.error) || result.status < 400 || (result.status !== 429 && result.status < 500);
}

function formatFetchError(url, err) {
  const code = err.cause?.code ?? err.message;
  const error = err.name === "TimeoutError" ? "timeout" : code;
  return { result: { url, status: 0, error }, fatal: code === "ENOTFOUND" };
}

/** An external link: HEAD, then GET if HEAD is refused; three tries with backoff on network errors, 429 and 5xx.
    `transient` is true when the last answer could be the network's or the host's mood (timeout, reset, 429, 5xx): reported,
    not fatal. A 4xx, an unknown host or a redirect loop is broken. */
export async function checkExternal(url, { fetchImpl = fetch, tries = 3, wait = 1500 } = {}) {
  let last = { url, status: 0, error: "not tried" };
  for (let i = 0; i < tries; i++) {
    try {
      last = await probeExternal(url, fetchImpl);
      if (isFinalExternalResult(last)) {
        return { ...last, transient: false };
      }
    } catch (e) {
      const { result, fatal } = formatFetchError(url, e);
      last = result;
      if (fatal) {
        return { ...last, transient: false };
      }
    }
    if (i < tries - 1) {
      await sleep(wait * (i + 1));
    }
  }
  return { ...last, transient: true };
}

function recordDiscoveredLink(target, fromUrl, ctx) {
  if (!isInternal(target, ctx.base)) {
    if (!ctx.externals.has(target)) {
      ctx.externals.set(target, fromUrl);
    }
    return;
  }
  if (!ctx.seen.has(target)) {
    ctx.seen.add(target);
    ctx.where.set(target, fromUrl);
    ctx.queue.push(target);
  }
}

function collectPageLinks(text, finalUrl, fromUrl, ctx) {
  for (const link of extractLinks(text)) {
    const resolved = resolve(link, finalUrl, ctx.base, ctx.host);
    if (resolved) {
      recordDiscoveredLink(resolved, fromUrl, ctx);
    }
  }
  for (const x of text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    const resolved = resolve(x[1], finalUrl, ctx.base, ctx.host);
    if (resolved && !isInternal(resolved, ctx.base) && !ctx.externals.has(resolved)) {
      ctx.externals.set(resolved, fromUrl);
    }
  }
}

async function visitInternalUrl(url, ctx) {
  let r;
  try {
    r = await follow(url, { fetchImpl: ctx.fetchImpl });
  } catch (e) {
    ctx.failures.push(`${url} — ${e.message} (linked from ${ctx.where.get(url)})`);
    return;
  }
  if (r.error || r.status < 200 || r.status >= 300) {
    ctx.failures.push(`${url} — ${r.error ?? r.status} (linked from ${ctx.where.get(url)})`);
    await r.body?.body?.cancel?.().catch(() => {});
    return;
  }
  if (!isInternal(r.final, ctx.base) || !(isPage(r.final, r.type) || r.final.endsWith(".txt"))) {
    await r.body?.body?.cancel?.().catch(() => {});
    return;
  }
  const text = await r.body.text();
  collectPageLinks(text, r.final, url, ctx);
}

async function classifyExternalUrl(url, linkedFrom, ctx, soft) {
  const r = await checkExternal(url, { fetchImpl: ctx.fetchImpl, wait: ctx.wait });
  const ok = !r.error && r.status >= 200 && r.status < 400;
  if (ok) {
    return;
  }
  const line = `${url} — ${r.error ?? r.status} (linked from ${linkedFrom})`;
  if (isSoft(url) || r.transient) {
    soft.push(line);
  } else {
    ctx.failures.push(line);
  }
}

async function checkExternalPool(ctx, soft) {
  const list = [...ctx.externals.keys()];
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const u = list[i++];
      await classifyExternalUrl(u, ctx.externals.get(u), ctx, soft);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`check-links: ${list.length} external URLs checked`);
}

export async function crawl({ base, host, external, fetchImpl = fetch, wait = 1500 }) {
  const start = [
    "/",
    "/fr/",
    "/feed.xml",
    "/atom.xml",
    "/fr/feed.xml",
    "/fr/atom.xml",
    "/sitemap.xml",
    "/llms.txt",
    "/404.html",
  ].map((p) => new URL(p, base).toString());
  const ctx = {
    base,
    host,
    fetchImpl,
    wait,
    queue: [...start],
    seen: new Set(start),
    where: new Map(start.map((u) => [u, "(start)"])),
    externals: new Map(),
    failures: [],
  };
  while (ctx.queue.length) {
    await visitInternalUrl(ctx.queue.shift(), ctx);
  }
  console.log(`check-links: ${ctx.seen.size} internal URLs, ${ctx.failures.length} broken`);
  const soft = [];
  if (external) {
    await checkExternalPool(ctx, soft);
  }
  for (const s of soft) {
    console.log(`not fatal (host refuses robots, or a transient answer after retries): ${s}`);
  }
  for (const f of ctx.failures) {
    console.error(`BROKEN ${f}`);
  }
  return ctx.failures.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const base = arg("--base", "http://localhost:3000");
  const host = arg("--host", siteUrl("blog"));
  const external = process.argv.includes("--external");
  const broken = await crawl({ base, host, external });
  process.exit(broken ? 1 : 0);
}
