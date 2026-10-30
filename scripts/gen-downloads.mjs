#!/usr/bin/env node
/* Downloads (krizaka-blog#211, PR 2). After the build (out/ exists):

     node scripts/gen-downloads.mjs [--out downloads-out]   make the EPUB and the PDF of the series and of every chapter, in each
                                                             language, and check each file; writes <out>/files.json
     node scripts/gen-downloads.mjs record [--out dir]      write their hashes and sizes into lib/downloads.json (after the upload)
     node scripts/gen-downloads.mjs check                   lib/downloads.json names current files for every chapter (the lint's check)

   Why these tools (trusted open source first): pandoc (GPL-2, run as a separate program, John MacFarlane and a large team, released
   monthly since 2006) writes the EPUB 3 — table of contents, chapter files, language, cover, alt text, accessibility metadata —
   and Chromium, which Playwright already brings for the layout checks, writes the PDF, tagged (a structure tree, /Lang, a title,
   an outline). Both read the chapters' pages the build exported, so the files carry exactly the text the pages do, from the same MDX. */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORMATS,
  SERIES,
  SITE,
  articleOf,
  bookId,
  bookName,
  bookSource,
  cleanArticle,
  fileHash,
  imagesWithoutAlt,
  manifestProblems,
  missingChapters,
  pdfProblems,
  planBooks,
} from "../lib/downloads-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(root, "lib/downloads.json");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const outDir = resolve(root, arg("out", "downloads-out"));
const message = (locale) => JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8"));

/** The published chapters: front matter (title, description, number, date) and the file's text. */
async function readChapters() {
  const { default: matter } = await import("gray-matter");
  const show = process.env.APP_SHOW_DRAFTS === "1";
  const dir = join(root, "content/chapters");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      const [, slug, locale] = f.match(/^(.+)\.(en|fr)\.mdx$/);
      const { data } = matter(text);
      return {
        slug,
        locale,
        text,
        draft: data.draft === true,
        chapter: Number(data.chapter),
        title: String(data.title),
        description: String(data.description),
        date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
      };
    })
    .filter((c) => show || !c.draft);
}

const urlOf = (c) => `${SITE}${c.locale === "fr" ? "/fr" : ""}/story/${c.slug}/`;

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
  if (r.status !== 0)
    throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} failed: ${(r.stderr || r.stdout).slice(0, 600)}`);
  return r.stdout;
}

/** Accessibility metadata of the EPUB (EPUB Accessibility 1.1, schema.org): what the file offers, said in the package. */
const A11Y = (lang) => `<dc:rights>© Krizaka</dc:rights>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessModeSufficient">textual</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta>
<meta property="schema:accessibilityFeature">readingOrder</meta>
<meta property="schema:accessibilityFeature">alternativeText</meta>
<meta property="schema:accessibilityHazard">none</meta>`;

const PRINT_CSS = `<style>
@page { size: A4; margin: 20mm 18mm; }
html { font: 11pt/1.55 Georgia, "Times New Roman", serif; color: #111; }
body { max-width: none; margin: 0; padding: 0; }
header#title-block-header { min-height: 230mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
header#title-block-header .title { font: 700 30pt/1.15 system-ui, sans-serif; margin: 0 0 8mm; }
header#title-block-header .author, header#title-block-header .date { font: 12pt system-ui, sans-serif; color: #444; margin: 0; }
nav#TOC { break-after: page; }
nav#TOC ul { list-style: none; padding-left: 0; } nav#TOC ul ul { padding-left: 1.2em; }
section[id^="ch-"], section#the-story { break-before: page; }
h1 { font: 700 20pt/1.2 system-ui, sans-serif; margin: 0 0 6mm; }
h2 { font: 700 14pt/1.3 system-ui, sans-serif; margin: 8mm 0 3mm; break-after: avoid; }
h3 { font: 700 12pt/1.3 system-ui, sans-serif; break-after: avoid; }
img { max-width: 100%; max-height: 120mm; height: auto; display: block; margin: 4mm auto; break-inside: avoid; }
figure { margin: 4mm 0; break-inside: avoid; } figcaption { font-size: 9.5pt; color: #444; }
pre, code { font: 9pt/1.4 ui-monospace, Menlo, monospace; } pre { white-space: pre-wrap; break-inside: avoid; background: #f4f4f4; padding: 3mm; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; break-inside: avoid; } th, td { border: 0.3pt solid #999; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
blockquote { margin: 4mm 0; padding-left: 4mm; border-left: 1mm solid #bbb; } a { color: #1a3fb0; }
</style>`;

const coverHtml = ({
  lang,
  kicker,
  title,
}) => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><body style="margin:0;width:1200px;height:1800px;box-sizing:border-box;padding:140px 110px;background:#0b1020;color:#f4f6ff;font:600 40px/1.3 system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between">
<div style="letter-spacing:.2em;text-transform:uppercase;font-size:34px;color:#7da2ff">Krizaka</div>
<div><div style="font-size:44px;color:#9aa6c8;margin-bottom:40px">${kicker}</div><div style="font-size:96px;line-height:1.1;font-weight:800">${title}</div></div>
<div style="font-size:34px;color:#9aa6c8">blog.krizaka.com</div></body></html>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One book: its source HTML, cover, EPUB and PDF in `dir`; returns the files' names. */
async function makeBook(browser, book, chapters, all, dir) {
  const t = message(book.locale);
  const own = book.slugs.map((s) => chapters.find((c) => c.slug === s && c.locale === book.locale));
  const parts = own.map((c) => {
    const html = readFileSync(
      join(root, "out", book.locale === "fr" ? "fr" : "", "story", c.slug, "index.html"),
      "utf8",
    );
    const article = articleOf(html);
    if (!article) throw new Error(`${bookId(book)}: no article in the page of ${c.slug}`);
    return { ...c, article: cleanArticle(article), url: urlOf(c) };
  });
  const single = book.key !== SERIES;
  const title = single ? parts[0].title : t.home.title;
  const labels = {
    lang: book.locale,
    title,
    readOnline: t.downloads.readOnline,
    storyHeading: t.downloads.storyHeading,
  };
  const name = bookName(book.key, book.locale);
  const source = join(dir, `${name}.source.html`);
  writeFileSync(
    source,
    bookSource({
      chapters: parts,
      labels,
      all: single ? chapters.filter((c) => c.locale === book.locale).map((c) => ({ ...c, url: urlOf(c) })) : undefined,
    }),
  );

  const cover = join(dir, `${name}.cover.png`);
  const shot = await browser.newPage({ viewport: { width: 1200, height: 1800 } });
  await shot.setContent(
    coverHtml({
      lang: book.locale,
      kicker: single ? t.home.title : String(parts.length) + " · " + t.downloads.storyHeading,
      title: esc(title),
    }),
  );
  await shot.screenshot({ path: cover });
  await shot.close();

  const meta = join(dir, `${name}.a11y.xml`);
  writeFileSync(meta, A11Y(book.locale));
  const last = parts
    .map((p) => p.date)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  const epoch = String(Math.floor(new Date(`${last}T12:00:00Z`).getTime() / 1000));
  const common = [
    "-f",
    "html",
    "-M",
    `title=${title}`,
    "-M",
    `lang=${book.locale}`,
    "-M",
    `author=${t.authors.oussama}`,
    "-M",
    `date=${last}`,
  ];
  const epub = join(dir, `${name}.epub`);
  run(
    "pandoc",
    [
      ...common,
      source,
      "-t",
      "epub3",
      "-o",
      epub,
      "--toc",
      "--toc-depth=2",
      "--split-level=1",
      `--epub-cover-image=${cover}`,
      `--epub-metadata=${meta}`,
      "-M",
      `identifier=${single ? urlOf(parts[0]) : `${SITE}${book.locale === "fr" ? "/fr" : ""}/`}`,
      "-M",
      "publisher=Krizaka",
    ],
    { SOURCE_DATE_EPOCH: epoch },
  );
  const printable = join(dir, `${name}.print.html`);
  const css = join(dir, "print.css.html");
  writeFileSync(css, PRINT_CSS);
  run("pandoc", [
    ...common,
    source,
    "-t",
    "html5",
    "-s",
    "--toc",
    "--toc-depth=2",
    `--include-in-header=${css}`,
    "-o",
    printable,
  ]);
  const page = await browser.newPage();
  await page.goto(`file://${printable}`, { waitUntil: "load" });
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((i) =>
        i.complete
          ? 0
          : new Promise((r) => {
              i.onload = i.onerror = r;
            }),
      ),
    ),
  );
  const pdf = join(dir, `${name}.pdf`);
  await page.pdf({
    path: pdf,
    format: "A4",
    tagged: true,
    outline: true,
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.close();
  return { epub, pdf, parts, source: printable };
}

/** The checks of a made book: every chapter is in each file, the pictures are described, the PDF is tagged and tells its language. */
function verifyBook(book, made) {
  const problems = [];
  const text = run("unzip", ["-p", made.epub, "*.xhtml"]);
  const missing = missingChapters(text, made.parts);
  if (missing.length > 0) problems.push(`epub lacks ${missing.join(" | ")}`);
  if (imagesWithoutAlt(text).length > 0) problems.push("epub has a picture without alt");
  const opf = run("unzip", ["-p", made.epub, "*.opf"]);
  if (!opf.includes(`<dc:language>${book.locale}</dc:language>`)) problems.push("epub has no language");
  if (!opf.includes("schema:accessibilityFeature")) problems.push("epub has no accessibility metadata");
  if (!opf.includes("cover-image")) problems.push("epub has no cover");
  if (!text.includes("<nav") || !text.includes('epub:type="toc"')) problems.push("epub has no table of contents");
  const html = readFileSync(made.source, "utf8");
  const gone = missingChapters(html, made.parts);
  if (gone.length > 0) problems.push(`pdf source lacks ${gone.join(" | ")}`);
  for (const p of pdfProblems(readFileSync(made.pdf), { lang: book.locale, pages: made.parts.length + 1 }))
    problems.push(`pdf ${p}`);
  return problems;
}

async function generate() {
  const chapters = await readChapters();
  const books = planBooks(chapters);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const files = {};
  const failures = [];
  try {
    for (const book of books) {
      const made = await makeBook(browser, book, chapters, chapters, outDir);
      const problems = verifyBook(book, made);
      for (const p of problems) failures.push(`${bookId(book)}: ${p}`);
      files[bookId(book)] = {
        source: book.source,
        files: Object.fromEntries(
          FORMATS.map((f) => {
            const bytes = readFileSync(made[f]);
            return [f, { name: `${bookName(book.key, book.locale)}.${f}`, hash: fileHash(bytes), bytes: bytes.length }];
          }),
        ),
      };
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(outDir, "files.json"), `${JSON.stringify({ books: files }, null, 2)}\n`);
  if (failures.length > 0) {
    console.error(`downloads: ${failures.length} problem(s)\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log(
    `downloads: ${books.length} books, ${books.length * FORMATS.length} files in ${outDir}, every chapter in each`,
  );
}

function record() {
  const made = JSON.parse(readFileSync(join(outDir, "files.json"), "utf8"));
  const books = Object.fromEntries(
    Object.entries(made.books).map(([id, b]) => [
      id,
      {
        source: b.source,
        files: Object.fromEntries(FORMATS.map((f) => [f, { hash: b.files[f].hash, bytes: b.files[f].bytes }])),
      },
    ]),
  );
  writeFileSync(MANIFEST, `${JSON.stringify({ books }, null, 2)}\n`);
  console.log(`downloads: lib/downloads.json records ${Object.keys(books).length} books`);
}

async function check() {
  const chapters = await readChapters();
  const problems = manifestProblems(JSON.parse(readFileSync(MANIFEST, "utf8")), planBooks(chapters));
  if (problems.length > 0) {
    console.error(`downloads: lib/downloads.json is not current\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`downloads: lib/downloads.json is current for ${chapters.length} chapters`);
}

const command = process.argv[2];
if (command === "record") record();
else if (command === "check") await check();
else await generate();
