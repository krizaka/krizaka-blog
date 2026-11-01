/* Downloads (krizaka-blog#211, PR 2): the EPUB and the PDF of every chapter and of the whole series, in each language. The part the
   generator (scripts/gen-downloads.mjs), the site (lib/downloads.ts) and the tests share. Plain ESM, no DOM, no dependency.

   The files are made at build from the pages the build exported (out/story/<slug>/index.html: the same MDX, rendered once), by pandoc
   (EPUB 3) and by Chromium (tagged PDF), and live on Bunny as hashed objects. lib/downloads.json (committed) names, per book, the
   hash of its source text and each file's hash and size: the page links the hashed URL, and the lint fails when a chapter changed
   and its files were not made again. */
import { createHash } from "node:crypto";

export const SITE = "https://blog.krizaka.com";
export const CDN_ORIGIN = "https://krizaka-assets.b-cdn.net";
/** Where krizaka-com's cdn-assets puts `--to blog/downloads` (layout v2: sites/<site>/<kind>/<name>.<hash>.<ext>). */
export const CDN_FOLDER = "sites/blog/posts/downloads";
/** Bump when the layout of the books changes: every book is then made again. */
export const GENERATOR_VERSION = 3;
export const FORMATS = ["epub", "pdf"];
/** The series' key in the manifest, next to the chapters' slugs. */
export const SERIES = "story";

const sha = (s) => createHash("sha256").update(s).digest("hex");

/** The hash of a book's source: the chapters' files (name and text) and the generator's version. */
export function sourceHash(files) {
  const h = createHash("sha256").update(`v${GENERATOR_VERSION}\n`);
  for (const f of [...files].sort((a, b) => a.name.localeCompare(b.name))) h.update(`${f.name}\n${f.text}\n`);
  return h.digest("hex").slice(0, 12);
}

/** The first 10 hex of a file's SHA-256, as cdn-assets names an object. */
export const fileHash = (bytes) => sha(bytes).slice(0, 10);

/** The file name of a book (before the hash): `<slug>-<locale>`, the series' being `story-<locale>`. */
export const bookName = (key, locale) => `${key}-${locale}`;

/** The CDN URL of a hashed download. */
export const downloadUrl = (key, locale, format, hash) =>
  `${CDN_ORIGIN}/${CDN_FOLDER}/${bookName(key, locale)}.${hash}.${format}`;

/** The index of the `</tag>` that closes the `<tag` opened at `from` (nested tags counted), or -1. */
export function closeOf(html, tag, from) {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let depth = 0;
  let i = from;
  for (;;) {
    const o = html.indexOf(open, i);
    const c = html.indexOf(close, i);
    if (c === -1) return -1;
    if (o !== -1 && o < c) {
      if (/[\s>/]/.test(html[o + open.length] ?? "")) depth += 1;
      i = o + open.length;
    } else {
      depth -= 1;
      if (depth === 0) return c;
      i = c + close.length;
    }
  }
}

/** Removes every `<tag …>…</tag>` (nested ones counted); `replace(openingTag)` gives what stands in its place. */
export function replaceElements(html, tag, replace = () => "") {
  let out = "";
  let i = 0;
  for (;;) {
    const start = html.indexOf(`<${tag}`, i);
    if (start === -1 || !/[\s>/]/.test(html[start + tag.length + 1] ?? "")) {
      if (start !== -1) {
        out += html.slice(i, start + 1);
        i = start + 1;
        continue;
      }
      return out + html.slice(i);
    }
    const end = closeOf(html, tag, start);
    const openEnd = html.indexOf(">", start);
    if (end === -1 || openEnd === -1) return out + html.slice(i);
    out += html.slice(i, start) + replace(html.slice(start, openEnd + 1));
    i = end + `</${tag}>`.length;
  }
}

/** Removes the `<tag … aria-hidden="true">…</tag>` elements: decoration a screen reader skips, a book has no use for (the round banners). */
export function removeHidden(html, tag) {
  let out = "";
  let i = 0;
  for (;;) {
    const m = new RegExp(String.raw`<${tag}\b[^>]*\saria-hidden="true"[^>]*>`).exec(html.slice(i));
    if (!m) return out + html.slice(i);
    const start = i + m.index;
    const end = closeOf(html, tag, start);
    if (end === -1) return out + html.slice(i);
    out += html.slice(i, start);
    i = end + `</${tag}>`.length;
  }
}

/** Removes the `<tag class="… cls …">…</tag>` elements. */
export function removeByClass(html, tag, cls) {
  let out = "";
  let i = 0;
  for (;;) {
    const m = new RegExp(String.raw`<${tag}\b[^>]*\sclass="(?:[^"]*\s)?${cls}(?:\s[^"]*)?"[^>]*>`).exec(html.slice(i));
    if (!m) return out + html.slice(i);
    const start = i + m.index;
    const end = closeOf(html, tag, start);
    if (end === -1) return out + html.slice(i);
    out += html.slice(i, start);
    i = end + `</${tag}>`.length;
  }
}

const attr = (opening, name) => opening.match(new RegExp(String.raw`\s${name}="([^"]*)"`))?.[1];

/** The text of an element standing for a picture a book cannot draw: its label, in a paragraph (never a silent hole). */
const labelled = (opening, fallback) => {
  const label = attr(opening, "aria-label");
  return label ? `<p class="figure-text"><em>${label}</em></p>` : fallback;
};

/** The body of a chapter, as the page exported it (<article class="bl-article">…</article>). */
export function articleOf(html) {
  const start = html.indexOf('<article class="bl-article">');
  if (start === -1) return undefined;
  const end = closeOf(html, "article", start);
  return end === -1 ? undefined : html.slice(start, end + "</article>".length);
}

/** The article made readable in a book: no script, style, button or form; a diagram or a clip is its label (alt text); the pictures
    keep their alt; the links are absolute; the blur placeholders (style attributes) are gone. */
export function cleanArticle(article) {
  // The pictures are lazy: the page draws an <img> with no src and keeps the real one (src, srcSet) in its <noscript> twin. A book has no
  // script, so the twin stands in place of the empty one — without this the books carried no picture at all.
  let h = article
    .replace(/<img\b(?![^>]*\ssrc=)[^>]*>(?=<noscript>)/g, "")
    .replace(/<noscript>(\s*<img\b[^>]*>\s*)<\/noscript>/g, "$1");
  for (const tag of ["script", "style", "noscript", "button", "template", "label", "input"])
    h = replaceElements(h, tag);
  // « How this was made » (Provenance) folds under a picture on the page; in a book it would unfold into a page of facts that pushes
  // the picture and its caption away. The page keeps it (the book links to it).
  h = removeByClass(h, "details", "bl-how");
  for (const tag of ["div", "span", "p"]) h = removeHidden(h, tag);
  h = replaceElements(h, "svg", (open) => (attr(open, "role") === "img" ? labelled(open, "") : ""));
  h = replaceElements(h, "video", (open) => labelled(open, ""));
  h = h
    .replace(/\sstyle="[^"]*"/g, "")
    .replace(/\s(?:srcSet|sizes|class|decoding|fetchPriority|data-[a-z-]+)="[^"]*"/g, "");
  // A chart's legend swatches are empty items once their drawing is gone: no row of lone bullets in a book.
  h = h.replace(/<li\b[^>]*>\s*<\/li>/g, "").replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/g, "");
  return h.replace(/\shref="\/(?!\/)/g, ` href="${SITE}/`);
}

/** The pictures of a cleaned article that carry no alt attribute at all (an empty alt is a decorative picture, said on purpose). */
export const imagesWithoutAlt = (html) =>
  [...html.matchAll(/<img\b[^>]*>/g)].filter((m) => !/\salt="/.test(m[0])).map((m) => m[0]);

const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const number = (n) => String(n).padStart(2, "0");

/** The pictures (src) of a cleaned article or of a book's source. */
export const imageUrls = (html) => [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);

/** « § 2.1 » in front of each section title of chapter `n`: the numbering of the Cahier, written in the text (a reader's CSS may drop a counter). */
export function numberSections(article, n) {
  let k = 0;
  return article.replace(/<h2\b([^>]*)>/g, (_, a) => {
    k += 1;
    return `<h2${a}><span class="sec">§&#160;${n}.${k}</span> `;
  });
}

/** The ids of a chapter, prefixed with its slug: a book holds many chapters whose sections share names (« what-i-take-from-it »), and an
    EPUB refuses a duplicate id. Links to an id (#…) follow; the aria references (labelledby…) to elements a book drops are removed. */
export function scopeIds(article, slug) {
  return article
    .replace(/\s(?:aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g, "")
    .replace(/\sid="([^"]+)"/g, (_, id) => ` id="${slug}--${id}"`)
    .replace(/\shref="#([^"]+)"/g, (_, id) => ` href="#${slug}--${id}"`);
}

/** One chapter as a section of a book: its heading (first, at the top of the section: pandoc builds the contents and the EPUB's chapter
    files from it), its opener (the cover full-bleed, « § NN », the standfirst — one page of its own in the PDF, where the generator
    moves the heading into it), the body, where to read it online. Pandoc keeps the class of a div, not of a paragraph. */
export function chapterSection(c, { readOnline, chapterWord = "", brand = "Krizaka" }) {
  const cover = c.cover
    ? `\n<figure class="opener-pic"><img src="${esc(c.cover.src)}" alt="${esc(c.cover.alt)}"/></figure>`
    : "";
  return `<section id="ch-${esc(c.slug)}" class="chapter">
<h1>${number(c.chapter)} · ${esc(c.title)}</h1>
<div class="opener${c.cover ? "" : " opener-plain"}">${cover}
<div class="opener-text">
<div class="opener-no">${esc(chapterWord)} § ${number(c.chapter)}</div>
<div class="opener-rule"></div>
<div class="standfirst"><em>${esc(c.description)}</em></div>
<div class="opener-big">${number(c.chapter)}</div>
<div class="opener-foot"><span>${esc(brand)}</span> <span>blog.krizaka.com</span></div>
</div>
</div>
${scopeIds(numberSections(c.article, c.chapter), c.slug)}
<div class="online">${esc(readOnline)} <a href="${esc(c.url)}">${esc(c.url)}</a></div>
</section>`;
}

/** The chapters of a book must run in the order of their numbers (1, 2, 3…), in the book's markup, TOC and body alike: not the blog's
    display order, not newest first. A language may lack a number (a chapter not yet translated): the order is what is checked, not the
    absence. Returns what is wrong (empty when the headings « NN · title » ascend). */
export function orderProblems(html) {
  const found = [...html.matchAll(/<h1\b[^>]*>\s*(\d{2}) · /g)].map((m) => Number(m[1]));
  return found.every((n, i) => i === 0 || n > found[i - 1])
    ? []
    : [`chapters run ${found.join(", ")}, not in number order (1 → N)`];
}

/** The closing list of a single chapter's book: every chapter of the story, linked to its page. */
export function chapterLinks(chapters, heading) {
  const items = chapters
    .map((c) => `<li><a href="${esc(c.url)}">${number(c.chapter)} · ${esc(c.title)}</a></li>`)
    .join("\n");
  return `<section id="the-story">\n<h1>${esc(heading)}</h1>\n<ol>\n${items}\n</ol>\n</section>`;
}

/** The HTML pandoc reads for a book: its chapters in reading order, then (a single chapter's book) the links to the others. */
export function bookSource({ chapters, labels, all }) {
  const sections = chapters.map((c) => chapterSection(c, labels)).join("\n");
  return `<!doctype html>\n<html lang="${esc(labels.lang)}"><head><meta charset="utf-8"><title>${esc(labels.title)}</title></head><body>\n${sections}\n${
    all ? chapterLinks(all, labels.storyHeading) : ""
  }\n</body></html>\n`;
}

/** What each chapter must show in a book of the chapters `expected`: the numbered heading text of each, in order. */
export const expectedHeadings = (chapters) => chapters.map((c) => `${number(c.chapter)} · ${c.title}`);

/** The text outside the `<…>` markers (read for comparison only, never written back out as HTML). */
function withoutTags(html) {
  let out = "";
  let inTag = false;
  for (const ch of html) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  return out;
}

/** A text with no markup, entities read and white space (pandoc wraps its lines) collapsed to single spaces. */
export const plain = (html) =>
  withoutTags(html)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

/** The headings missing from `text` (the book's markup), in the order expected — empty when every chapter is in. */
export function missingChapters(text, chapters) {
  const flat = plain(text);
  return expectedHeadings(chapters).filter((h) => !flat.includes(plain(h)));
}

/** The structure markers a tagged, titled, language-tagged PDF has in its bytes (Chromium writes the catalogue uncompressed). */
export function pdfProblems(bytes, { lang, pages }) {
  const text = Buffer.from(bytes).toString("latin1");
  const problems = [];
  if (!text.startsWith("%PDF-")) problems.push("not a PDF");
  if (!text.includes("/StructTreeRoot")) problems.push("not tagged (no /StructTreeRoot)");
  if (!new RegExp(String.raw`/Lang\s*\(${lang}`).test(text)) problems.push(`no language tag (/Lang ${lang})`);
  if (!/\/Title\s*[(<]/.test(text)) problems.push("no title");
  const count = (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
  if (count < pages) problems.push(`${count} page(s), at least ${pages} expected`);
  return problems;
}

/** The books of the story from its chapters ({ slug, locale, chapter, text }: the file's text): per language the whole series, then
    each chapter. `source` is the hash of the text a book is made of. */
export function planBooks(chapters) {
  const books = [];
  for (const locale of [...new Set(chapters.map((c) => c.locale))].sort((a, b) => a.localeCompare(b))) {
    const own = chapters.filter((c) => c.locale === locale).sort((a, b) => a.chapter - b.chapter);
    const part = (c) => ({ name: `${c.slug}.${c.locale}`, text: c.text });
    books.push({ key: SERIES, locale, slugs: own.map((c) => c.slug), source: sourceHash(own.map(part)) });
    for (const c of own) books.push({ key: c.slug, locale, slugs: [c.slug], source: sourceHash([part(c)]) });
  }
  return books;
}

export const bookId = (b) => `${b.locale}/${b.key}`;

/** What is wrong with lib/downloads.json for these books: a book without its files, a book whose text changed since its files were
    made, a book of a chapter that is gone. Empty when every chapter and the series have both formats, current. */
export function manifestProblems(manifest, books) {
  const entries = manifest?.books ?? {};
  const problems = [];
  for (const b of books) {
    const e = entries[bookId(b)];
    if (!e) problems.push(`${bookId(b)}: no files (run scripts/gen-downloads.mjs, upload, then record)`);
    else if (e.source !== b.source)
      problems.push(`${bookId(b)}: its text changed since its files were made (${e.source} → ${b.source})`);
    else
      for (const f of FORMATS)
        if (!e.files?.[f]?.hash || (e.files[f].bytes ?? 0) <= 0) problems.push(`${bookId(b)}: no ${f}`);
  }
  const known = new Set(books.map(bookId));
  for (const id of Object.keys(entries))
    if (!known.has(id)) problems.push(`${id}: a book of no chapter any more (remove it)`);
  return problems;
}
