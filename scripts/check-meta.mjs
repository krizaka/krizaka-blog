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
import { hasClass, readHtml } from "./html-tree.mjs";

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

const meta = (page, test) => page.tags("meta", test)[0];
const metaNamed = (page, name) => meta(page, (el) => el.attribs.name === name);
const withWidths = (set) => (set ?? "").split(",").filter((c) => TRAILING_WIDTH.test(c)).length;
/** `https://c.example/a-480.avif 480w`: a candidate of a srcset ends with its width. */
const TRAILING_WIDTH = /\s\d+w\s*$/;
/** `0; url=/story/x/`: the content of a 0-second refresh, its target after `url=`. */
const IMMEDIATE_REFRESH = /^0; url=(.+)$/i;
/** `NaN` or `undefined` as a word: a number that failed to compute. */
const BROKEN_FIGURE = /\b(NaN|undefined)\b/;

/** The problems of one page's HTML; an empty list when it is fine. */
export function metaProblems(html) {
  const out = [];
  const page = readHtml(html);
  const titleEl = page.tags("title")[0];
  const title = decode(titleEl && !titleEl.children.some((c) => c.type === "tag") ? page.text(titleEl) : "");
  if (!title) out.push("no title");
  else if ([...title].length > TITLE_MAX)
    out.push(`title is ${[...title].length} characters (max ${TITLE_MAX}): ${title}`);
  const description = metaNamed(page, "description")?.attribs.content;
  if (description === undefined) out.push("no meta description");
  else if ([...decode(description)].length > DESCRIPTION_MAX)
    out.push(`description is ${[...decode(description)].length} characters (max ${DESCRIPTION_MAX})`);
  const h1 = page.tags("h1").length;
  if (h1 !== 1) out.push(`${h1} h1 (one expected)`);
  for (const img of page.tags("img", (el) => !("alt" in el.attribs)))
    out.push(`an image without alt: ${page.source(img).slice(0, 80)}`);
  /* A number that failed to compute (a prop the renderer dropped) must never reach a reader. */
  if (visibleText(html, { prose: true }).some((t) => BROKEN_FIGURE.test(t)))
    out.push("the page shows NaN or undefined");
  return out;
}

/** A post page's cover (the LCP): inside a <picture> whose AVIF source and WebP <img> both carry a srcset of at least three widths and a
    sizes, fetched at high priority and preloaded in the head. The problems; an empty list when it is fine. */
export function coverProblems(html) {
  const page = readHtml(html);
  const img = page.tags("img", (el) => hasClass(el, "bl-cover"))[0];
  if (!img) return ["no cover image (img.bl-cover)"];
  const out = [];
  if (withWidths(img.attribs.srcset) < 3) out.push("the cover's <img> needs a srcset of at least three widths");
  if (!img.attribs.sizes) out.push("the cover's <img> needs sizes");
  if ((img.attribs.fetchpriority ?? "").toLowerCase() !== "high")
    out.push('the cover is the LCP: fetchpriority="high"');
  const source = page.tags("source", (el) => (el.attribs.type ?? "").toLowerCase() === "image/avif")[0];
  if (!source || withWidths(source.attribs.srcset) < 3)
    out.push("the cover needs an AVIF <source> with a srcset of at least three widths");
  const link = page.tags("link", (el) => el.attribs.rel?.toLowerCase() === "preload" && el.attribs.as === "image")[0];
  if (!link || withWidths(link.attribs.imagesrcset) < 3) out.push("the cover is preloaded in the head (imagesrcset)");
  return out;
}

/* A retired post's stub (app/components/pages/RetiredPost.tsx): no title, description or h1, but a 0-second refresh, a canonical to
   the same address, noindex and a visible link to it. The problems; an empty list when it is fine. */
export function stubProblems(html) {
  const out = [];
  const page = readHtml(html);
  const refreshTag = meta(page, (el) => el.attribs["http-equiv"]?.toLowerCase() === "refresh");
  const refresh = IMMEDIATE_REFRESH.exec(refreshTag?.attribs.content ?? "")?.[1];
  if (!refresh) out.push("a stub needs a 0-second refresh (meta http-equiv=refresh)");
  const canonical = page.tags("link", (el) => el.attribs.rel?.toLowerCase() === "canonical")[0]?.attribs.href;
  if (!canonical) out.push("a stub needs a canonical");
  else if (refresh && !canonical.replace(/\/+$/, "").endsWith(refresh.replace(/\/+$/, "")))
    out.push(`the stub's canonical (${canonical}) is not its refresh target (${refresh})`);
  const robots = metaNamed(page, "robots")?.attribs.content ?? "";
  if (!robots.toLowerCase().includes("noindex")) out.push("a stub is not noindex");
  if (refresh && !html.includes(`<a href="${refresh}"`)) out.push(`a stub has no visible link to ${refresh}`);
  if (visibleText(html, { prose: true }).some((t) => BROKEN_FIGURE.test(t)))
    out.push("the page shows NaN or undefined");
  return out;
}

/** The chapter rows of the home's `ol.kz-chapters` (@krizaka/ui's ChapterIndex): its number in `.kz-chapter-no`, the first link. */
function chapterRows(page, list) {
  const rows = [];
  for (const li of page.tags("li").filter((el) => el.parent === list)) {
    const number = page.find((el) => el.name === "span" && el.attribs.class === "kz-chapter-no" && isInside(el, li));
    const link = page.findAll(
      (el) =>
        el.name === "a" && "href" in el.attribs && isInside(el, li) && el.startIndex > (number?.startIndex ?? Infinity),
    )[0];
    const digits = number ? page.text(number) : "";
    if (DIGITS.test(digits) && link)
      rows.push({ n: Number(digits), isNew: "data-new" in li.attribs, href: link.attribs.href });
  }
  return rows;
}
const DIGITS = /^\d+$/;
const isInside = (el, ancestor) => {
  for (let p = el.parent; p; p = p.parent) if (p === ancestor) return true;
  return false;
};

/** The home (`/`, `/fr/`): the sentence, one Featured card (the newest chapter), and the other chapters newest first, Featured not repeated. */
export function homeProblems(html) {
  const out = [];
  const page = readHtml(html);
  const sentenceEl = page.find((el) => el.name === "span" && el.attribs.class === "bl-home-sentence");
  const onlyText = sentenceEl?.children.every((c) => c.type === "text");
  const sentence = onlyText ? page.text(sentenceEl).trim() : "";
  if (!sentence) out.push("the home has no sentence (the hero's lead, .bl-home-sentence)");
  /* A Section's id is its heading's (`aria-labelledby`). */
  const featured = page.find((el) => el.name === "section" && el.attribs["aria-labelledby"] === "featured");
  if (!featured) out.push("the home has no Featured section (#featured)");
  else if (page.findAll((el) => hasClass(el, "bl-card-feature") && isInside(el, featured)).length !== 1)
    out.push("Featured holds exactly one card");
  /* The chapters are @krizaka/ui's ChapterIndex: an <ol class="kz-chapters">, one <li> each, its number in .kz-chapter-no. */
  const list = page.tags("ol", (el) => hasClass(el, "kz-chapters"))[0];
  const rows = list ? chapterRows(page, list) : [];
  if (!rows.length) out.push("the home lists no chapter (ol.kz-chapters)");
  rows.forEach((r, i) => {
    if (i > 0 && r.n >= rows[i - 1].n) out.push(`the chapters are not newest first: row ${i + 1} is chapter ${r.n}`);
  });
  const card =
    featured &&
    page.findAll((el) => el.name === "a" && el.attribs.class === "bl-card-link" && isInside(el, featured))[0];
  const href = card?.attribs.href;
  if (href && rows.some((r) => r.href === href)) out.push(`Featured (${href}) is repeated in the list`);
  return out;
}

/** The sections of the one-page blog that were removed (stubs now): a live page never links to them. */
export const REMOVED_SECTIONS = ["tags", "series", "search", "saved", "feed"];
/** The exact addresses removed too: the old story index and the posts index. */
export const REMOVED_INDEXES = ["/story/", "/posts/"];

/** True when an address (`/tags/ai/`, `/fr/story/`) is one the one-page blog removed. */
export function isRemovedAddress(href) {
  const path = href.startsWith("/fr/") ? href.slice(3) : href;
  return REMOVED_INDEXES.includes(path) || REMOVED_SECTIONS.some((section) => path.startsWith(`/${section}/`));
}

export function removedLinkProblems(html) {
  const hrefs = readHtml(html)
    .findAll((el) => "href" in el.attribs)
    .map((el) => el.attribs.href);
  return [...new Set(hrefs.filter(isRemovedAddress).map((href) => `href="${href}"`))].map(
    (m) => `links to a removed address: ${m}`,
  );
}

/** The problems of one built page: a stub is checked as a stub, a live page as an article (its meta, its links, the home's story,
    and its cover on a shelf post or a chapter). */
export function pageProblems(html, rel) {
  if (/http-equiv="refresh"/i.test(html)) return stubProblems(html);
  const out = [...metaProblems(html), ...removedLinkProblems(html)];
  if (rel === "" || rel === "fr/") out.push(...homeProblems(html));
  if (rel && SHELF_OR_CHAPTER.test(rel)) out.push(...coverProblems(html));
  return out;
}
/** `basics/x/`, `fr/story/x/`: a shelf post or a chapter, which carries a cover. */
const SHELF_OR_CHAPTER = /^(fr\/)?(basics|story)\/[^/]+\/$/;

/** The folders of the build that are not pages to check: the editor, the private preview, assets, the 404. */
export const SKIPPED = ["admin", "preview", "_next", "og", "fr/og", "404", "_not-found"];
const isSkipped = (rel) => SKIPPED.some((name) => rel === name || rel.startsWith(`${name}/`));

function* pages(dir, root = dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(root, p);
    if (isSkipped(rel)) continue;
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
