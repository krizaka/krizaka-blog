#!/usr/bin/env node
/* What every built page shows a search engine (run on out/ after `npm run build`): a <title> of at most 60 characters and
   a meta description of at most 155 (longer ones are cut in the results), exactly one h1, an alt on every image, and no
   NaN or undefined in the text. The blog is one page, the story (krizaka-blog#123): the home must show its sentence, one
   Featured card (the latest chapter) and every chapter in reading order with the latest marked new; no live page links to a
   removed address (the topics, the series, search, saved, the feed page, the old story index — they are stubs).
   Usage: node scripts/check-meta.mjs out   — the 404, the editor (/admin) and the private preview are skipped. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** The text between tags, outside <script> and <style> (a scan, not a sanitizer: the build's own HTML, read for a check).
    `prose`: also outside <pre>, the code blocks, where `undefined` is a word of the language quoted, not a broken figure. */
export function visibleText(html, { prose = false } = {}) {
  const out = [];
  let skip = "";
  for (const part of html.split("<").slice(1)) {
    const close = part.indexOf(">");
    if (close < 0) continue;
    const tag = part.slice(0, close).toLowerCase();
    const name = tag.match(/^\/?([a-z0-9-]+)/)?.[1] ?? "";
    if (skip) {
      if (tag.startsWith("/") && name === skip) skip = "";
      continue;
    }
    if ((name === "script" || name === "style" || (prose && name === "pre")) && !tag.startsWith("/")) {
      skip = name;
      continue;
    }
    const text = part.slice(close + 1);
    if (text.trim()) out.push(text);
  }
  return out;
}

/** The problems of one page's HTML; an empty list when it is fine. */
export function metaProblems(html) {
  const out = [];
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  if (!title) out.push("no title");
  else if ([...title].length > TITLE_MAX)
    out.push(`title is ${[...title].length} characters (max ${TITLE_MAX}): ${title}`);
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (description === undefined) out.push("no meta description");
  else if ([...decode(description)].length > DESCRIPTION_MAX)
    out.push(`description is ${[...decode(description)].length} characters (max ${DESCRIPTION_MAX})`);
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) out.push(`${h1} h1 (one expected)`);
  for (const img of html.match(/<img\b[^>]*>/g) ?? [])
    if (!/\balt=/.test(img)) out.push(`an image without alt: ${img.slice(0, 80)}`);
  /* A number that failed to compute (a prop the renderer dropped) must never reach a reader. */
  if (visibleText(html, { prose: true }).some((t) => /\b(NaN|undefined)\b/.test(t)))
    out.push("the page shows NaN or undefined");
  return out;
}

/** A post page's cover (the LCP): inside a <picture> whose AVIF source and WebP <img> both carry a srcset of at least three widths and a
    sizes, fetched at high priority and preloaded in the head. The problems; an empty list when it is fine. */
export function coverProblems(html) {
  const img = html.match(/<img\b[^>]*\bclass="[^"]*\bbl-cover\b[^"]*"[^>]*>/i)?.[0];
  if (!img) return ["no cover image (img.bl-cover)"];
  const out = [];
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
  const widths = (set) => (set ?? "").split(",").filter((c) => /\s\d+w\s*$/.test(c)).length;
  if (widths(attr(img, "srcset")) < 3) out.push("the cover's <img> needs a srcset of at least three widths");
  if (!attr(img, "sizes")) out.push("the cover's <img> needs sizes");
  if (!/^high$/i.test(attr(img, "fetchpriority") ?? "")) out.push('the cover is the LCP: fetchpriority="high"');
  const source = html.match(/<source\b[^>]*type="image\/avif"[^>]*>/i)?.[0];
  if (!source || widths(attr(source, "srcset")) < 3)
    out.push("the cover needs an AVIF <source> with a srcset of at least three widths");
  const link = html.match(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/i)?.[0];
  if (!link || widths(attr(link, "imagesrcset")) < 3) out.push("the cover is preloaded in the head (imagesrcset)");
  return out;
}

/* A retired post's stub (app/components/pages/RetiredPost.tsx): no title, description or h1, but a 0-second refresh, a canonical to
   the same address, noindex and a visible link to it. The problems; an empty list when it is fine. */
export function stubProblems(html) {
  const out = [];
  const refreshTag = html.match(/<meta\b[^>]*http-equiv="refresh"[^>]*>/i)?.[0] ?? "";
  const refresh = refreshTag.match(/\bcontent="0; url=([^"]+)"/i)?.[1];
  if (!refresh) out.push("a stub needs a 0-second refresh (meta http-equiv=refresh)");
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i)?.[0].match(/\bhref="([^"]+)"/i)?.[1];
  if (!canonical) out.push("a stub needs a canonical");
  else if (refresh && !canonical.replace(/\/+$/, "").endsWith(refresh.replace(/\/+$/, "")))
    out.push(`the stub's canonical (${canonical}) is not its refresh target (${refresh})`);
  const robots = html.match(/<meta\b[^>]*name="robots"[^>]*>/i)?.[0] ?? "";
  if (!/\bcontent="[^"]*noindex/i.test(robots)) out.push("a stub is not noindex");
  if (refresh && !html.includes(`<a href="${refresh}"`)) out.push(`a stub has no visible link to ${refresh}`);
  if (visibleText(html, { prose: true }).some((t) => /\b(NaN|undefined)\b/.test(t)))
    out.push("the page shows NaN or undefined");
  return out;
}

/** The home (`/`, `/fr/`): the sentence, one Featured card (the newest chapter), and the other chapters newest first, Featured not repeated. */
export function homeProblems(html) {
  const out = [];
  const sentence = html.match(/<span class="bl-home-sentence">([^<]*)<\/span>/)?.[1]?.trim();
  if (!sentence) out.push("the home has no sentence (the hero's lead, .bl-home-sentence)");
  /* A Section's id is its heading's (`aria-labelledby`). */
  const featured = html.match(/<section\b[^>]*\baria-labelledby="featured"[\s\S]*?<\/section>/)?.[0] ?? "";
  if (!featured) out.push("the home has no Featured section (#featured)");
  else if ((featured.match(/\bbl-card-feature\b/g) ?? []).length !== 1) out.push("Featured holds exactly one card");
  /* The chapters are @krizaka/ui's ChapterIndex: an <ol class="kz-chapters">, one <li> each, its number in .kz-chapter-no. */
  const list = html.match(/<ol\b[^>]*\bclass="[^"]*\bkz-chapters\b[^"]*"[\s\S]*?<\/ol>/)?.[0] ?? "";
  const rows = [
    ...list.matchAll(
      /<li\b([^>]*)>[\s\S]*?<span\b[^>]*\bclass="kz-chapter-no"[^>]*>(\d+)<\/span>[\s\S]*?<a\b[^>]*\bhref="([^"]+)"/g,
    ),
  ].map((m) => ({ n: Number(m[2]), isNew: /\bdata-new\b/.test(m[1]), href: m[3] }));
  if (!rows.length) out.push("the home lists no chapter (ol.kz-chapters)");
  rows.forEach((r, i) => {
    if (i > 0 && r.n >= rows[i - 1].n) out.push(`the chapters are not newest first: row ${i + 1} is chapter ${r.n}`);
  });
  const featuredHref = featured.match(
    /<a\b[^>]*\bclass="bl-card-link"[^>]*\bhref="([^"]+)"|<a\b[^>]*\bhref="([^"]+)"[^>]*\bclass="bl-card-link"/,
  );
  const href = featuredHref?.[1] ?? featuredHref?.[2];
  if (href && rows.some((r) => r.href === href)) out.push(`Featured (${href}) is repeated in the list`);
  return out;
}

/** The addresses the one-page blog removed (stubs now): a live page never links to them. */
const REMOVED_LINK = /\bhref="(?:\/fr)?\/(?:(?:tags|series|search|saved|feed)\/[^"]*|story\/|posts\/)"/g;
export function removedLinkProblems(html) {
  return [...new Set([...html.matchAll(REMOVED_LINK)].map((m) => m[0]))].map((m) => `links to a removed address: ${m}`);
}

/** The problems of one built page: a stub is checked as a stub, a live page as an article (its meta, its links, the home's story,
    and its cover on a shelf post or a chapter). */
export function pageProblems(html, rel) {
  if (/http-equiv="refresh"/i.test(html)) return stubProblems(html);
  const out = [...metaProblems(html), ...removedLinkProblems(html)];
  if (rel === "" || rel === "fr/") out.push(...homeProblems(html));
  if (rel && /^(fr\/)?(basics|story)\/[^/]+\/$/.test(rel)) out.push(...coverProblems(html));
  return out;
}

function* pages(dir, root = dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(root, p);
    if (/^(admin|preview|_next|og|fr\/og|404|_not-found)(\/|$)/.test(rel)) continue;
    if (statSync(p).isDirectory()) yield* pages(p, root);
    else if (name === "index.html") yield p;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? "out";
  const problems = [];
  let n = 0;
  for (const file of pages(dir)) {
    n++;
    const html = readFileSync(file, "utf8");
    const rel = `/${relative(dir, file).replace(/index\.html$/, "")}`;
    for (const p of pageProblems(html, rel.slice(1))) problems.push(`${rel}: ${p}`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(
    `check-meta: ${n} pages — titles ≤ ${TITLE_MAX}, descriptions ≤ ${DESCRIPTION_MAX}, one h1, every image with an alt, the home's story, no link to a removed page`,
  );
}
