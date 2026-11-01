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
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FACES, TEXT_BLOCK, coverHtml, epubCss, printCss } from "../lib/ebook-style.mjs";
import { MM, pdfLayoutProblems, pushedPictures, readPages } from "../lib/pdf-layout.mjs";
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
  imageUrls,
  imagesWithoutAlt,
  orderProblems,
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
        cover: data.cover ? String(data.cover) : undefined,
        coverAlt: data.coverAlt ? String(data.coverAlt) : undefined,
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
const A11Y = () => `<dc:rights>© Krizaka</dc:rights>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessMode">visual</meta>
<meta property="schema:accessModeSufficient">textual</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta>
<meta property="schema:accessibilityFeature">readingOrder</meta>
<meta property="schema:accessibilityFeature">alternativeText</meta>
<meta property="schema:accessibilityHazard">none</meta>`;

const FONTS = join(root, "node_modules/@krizaka/fonts/files/web");
const media = JSON.parse(readFileSync(join(root, "lib/media.json"), "utf8"));
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
// An absolute path, not a lookup in PATH (the CI runner keeps java here).
const JAVA = "/usr/bin/java";
const BACKSLASH = String.fromCharCode(92);
const cssString = (s) => String(s).replaceAll(/[\\"]/g, (c) => BACKSLASH + c);

/** A chapter's cover picture (a media entry, 960 px wide when it has it) and its alt text. */
function coverOf(c) {
  const m = c.cover && media[c.cover];
  if (!m) return undefined;
  const src = (m.srcs.find((x) => x.w === 960) ?? m.srcs.at(-1)).url;
  return { src, alt: c.coverAlt ?? "" };
}

/** Every picture of a book as a local JPEG in `<dir>/img/`: the pages serve WebP, which an EPUB reader may not draw (EPUB 3 core media
    types), so Chromium decodes each file once and writes a JPEG on white. Fills `done`: url → "img/<hash>.jpg". */
async function localImages(browser, urls, dir, done) {
  mkdirSync(join(dir, "img"), { recursive: true });
  const page = await browser.newPage();
  try {
    for (const url of new Set(urls)) {
      if (done.has(url)) continue;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`image ${url}: HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/webp";
      const jpeg = await page.evaluate(
        async ([b64, type]) => {
          const img = new Image();
          img.src = `data:${type};base64,${b64}`;
          await img.decode();
          const scale = Math.min(1, 1600 / img.naturalWidth);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
        },
        [bytes.toString("base64"), mime],
      );
      const name = `img/${fileHash(bytes)}.jpg`;
      writeFileSync(join(dir, name), Buffer.from(jpeg, "base64"));
      done.set(url, name);
    }
  } finally {
    await page.close();
  }
}

async function shoot(browser, dir, name, html, width, height) {
  const file = join(dir, `${name}.html`);
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = join(dir, `${name}.png`);
  await page.screenshot({ path: png });
  await page.close();
  return png;
}

const images = new Map();

/** The repair pass, in the print page: each picture the PDF shows pushed to the next page ({ index, room } from pushedPictures) is
    shrunk to the room it left (back in the text block, its caption and margins counted, 8 mm to spare, 4 more at each pass) when it keeps 55 mm; otherwise the
    paragraphs after it move before it, as many as the room holds, so the text fills the page and the picture opens the next one. */
function placePictures({ pushed, ptToPx, mm, slack }) {
  const pictures = [...document.querySelectorAll("section.chapter img")].filter((img) => !img.closest(".opener"));
  let changed = 0;
  for (const { index, room } of [...pushed].reverse()) {
    const img = pictures[index];
    const fig = img?.closest("figure");
    if (!img || !fig) continue;
    const roomPx = room * ptToPx;
    const target = img.getBoundingClientRect().height - (fig.getBoundingClientRect().height - roomPx) - slack * mm;
    if (target >= 55 * mm) {
      img.style.maxHeight = `${Math.floor(target)}px`;
      changed += 1;
      continue;
    }
    let filled = 0;
    let next = fig.nextElementSibling;
    while (next && next.tagName === "P" && filled + next.getBoundingClientRect().height <= roomPx) {
      filled += next.getBoundingClientRect().height;
      const after = next.nextElementSibling;
      fig.before(next);
      next = after;
      changed += 1;
    }
  }
  return changed;
}

/** The fit pass, run in the print page before Chromium cuts it into pages (founder 2026-10-31: no caption pushed away from its
    picture, no white page). It walks each chapter's pictures in order, as the A4 text block will hold them: a picture whose figure
    (picture + caption, never split: break-inside: avoid) does not fit in the room left on its page is shrunk to that room when the
    room is at least 30 % of a page and the picture keeps 55 mm; otherwise it opens the next page and the room it leaves (under
    30 %) is counted. Then the PDF is read back page by page (placePictures, lib/pdf-layout.mjs). */
function fitPictures({ pageHeight: H, mm }) {
  const out = { shrunk: 0, pushed: 0 };
  // Runs in the page (page.evaluate serialises this function): the helpers are nested on purpose.
  const walk = (section) => {
    const flow = [...section.children].filter((el) => !el.classList.contains("opener"));
    if (flow.length === 0) return;
    const y0 = flow[0].getBoundingClientRect().top + window.scrollY;
    let shift = 0;
    for (const fig of section.querySelectorAll("figure:not(.opener-pic)")) {
      const img = fig.querySelector("img");
      if (!img) continue;
      const r = fig.getBoundingClientRect();
      const room = H - ((r.top + window.scrollY - y0 + shift) % H);
      if (r.height <= room) continue;
      // 14 mm of slack: Chromium's own cuts (a heading kept with its text, three lines kept together) move the flow a little.
      const target = img.getBoundingClientRect().height - (r.height - room) - 14 * mm;
      if (room >= 0.3 * H && target >= 55 * mm) {
        img.style.maxHeight = `${Math.floor(target)}px`;
        out.shrunk += 1;
      } else {
        shift += room;
        out.pushed += 1;
      }
    }
  };
  document.querySelectorAll("section.chapter").forEach(walk);
  return out;
}

/** The chapters of a book: their article read from the built site, their pictures downloaded next to the book. */
async function loadParts(browser, book, chapters, dir) {
  const own = book.slugs.map((s) => chapters.find((c) => c.slug === s && c.locale === book.locale));
  const parts = own.map((c) => {
    const html = readFileSync(
      join(root, "out", book.locale === "fr" ? "fr" : "", "story", c.slug, "index.html"),
      "utf8",
    );
    const article = articleOf(html);
    if (!article) throw new Error(`${bookId(book)}: no article in the page of ${c.slug}`);
    return { ...c, article: cleanArticle(article), url: urlOf(c), cover: coverOf(c) };
  });
  await localImages(
    browser,
    parts.flatMap((p) => [...imageUrls(p.article), ...(p.cover ? [p.cover.src] : [])]),
    dir,
    images,
  );
  for (const p of parts) {
    p.article = p.article.replace(/(<img\b[^>]*\ssrc=")([^"]+)(")/g, (m, a, u, z) => `${a}${images.get(u) ?? u}${z}`);
    if (p.cover) p.cover = { ...p.cover, src: images.get(p.cover.src) };
  }
  return parts;
}

/** The fonts next to the pages; the covers drawn with them, the same design at the e-book's and at the page's proportions. */
async function drawCovers(browser, { book, t, parts, single, title, name, dir }) {
  mkdirSync(join(dir, "fonts"), { recursive: true });
  for (const f of FACES) copyFileSync(join(FONTS, f.file), join(dir, "fonts", f.file));
  const coverArgs = {
    lang: book.locale,
    kicker: single ? t.home.title : `${parts.length} ${t.downloads.chaptersWord}`,
    title,
    lede: single ? parts[0].description : t.downloads.coverLede,
    author: t.authors.oussama,
    label: t.downloads.coverLabel,
    image: single && parts[0].cover ? `file://${join(dir, parts[0].cover.src)}` : undefined,
    fontsBase: `file://${join(dir, "fonts")}/`,
  };
  const ebookCover = await shoot(browser, dir, `${name}.cover-ebook`, coverHtml(coverArgs), 1200, 1800);
  const printCover = await shoot(browser, dir, `${name}.cover-print`, coverHtml(coverArgs), 1240, 1754);
  return { ebookCover, printCover };
}

/** The EPUB, built by pandoc from the book source; also returns the pandoc arguments the PDF source shares. */
function buildEpub({ book, t, parts, single, title, name, dir, ebookCover, source }) {
  const last = parts
    .map((p) => p.date)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  const epoch = String(Math.floor(new Date(`${last}T12:00:00Z`).getTime() / 1000));
  const common = [
    "-f",
    "html",
    "--resource-path",
    dir,
    "-M",
    `title=${title}`,
    "-M",
    `lang=${book.locale}`,
    "-M",
    `author=${t.authors.oussama}`,
    "-M",
    `date=${last}`,
    "-M",
    `toc-title=${t.downloads.contents}`,
  ];
  const meta = join(dir, `${name}.a11y.xml`);
  writeFileSync(meta, A11Y());
  const css = join(dir, "epub.css");
  writeFileSync(css, epubCss());
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
      `--css=${css}`,
      `--epub-cover-image=${ebookCover}`,
      `--epub-metadata=${meta}`,
      ...FACES.map((f) => `--epub-embed-font=${join(dir, "fonts", f.file)}`),
      "-M",
      `identifier=${single ? urlOf(parts[0]) : `${SITE}${book.locale === "fr" ? "/fr" : ""}/`}`,
      "-M",
      "publisher=Krizaka",
    ],
    { SOURCE_DATE_EPOCH: epoch },
  );
  return { common, epub };
}

/** The PDF: the print page cut by pandoc, fitted to the A4 text block, then repaired page by page from what Chromium really cut. */
async function buildPdf(browser, { t, single, title, name, dir, common, source, printCover }) {
  const printable = join(dir, `${name}.print.html`);
  const head = join(dir, "print.css.html");
  writeFileSync(
    head,
    `<style>${printCss({ fontsBase: "fonts/", runningTitle: cssString(title), runningKicker: cssString(t.downloads.coverLabel) })}</style>`,
  );
  const before = join(dir, `${name}.cover.html`);
  writeFileSync(
    before,
    `<section class="cover"><img src="${esc(basename(printCover))}" alt="${esc(title)}"/></section>`,
  );
  run("pandoc", [
    ...common,
    source,
    "-t",
    "html5",
    "-s",
    // A chapter's book has no contents page (one entry on a white page); the PDF's outline still lists its sections.
    ...(single ? [] : ["--toc", "--toc-depth=2"]),
    `--include-in-header=${head}`,
    `--include-before-body=${before}`,
    "-o",
    printable,
  ]);
  // The text block's width (the margins of @page), in print media: the fit pass measures the flow as Chromium will cut it.
  const px = 96 / 25.4;
  const page = await browser.newPage({ viewport: { width: Math.round(TEXT_BLOCK.width * px), height: 1200 } });
  await page.emulateMedia({ media: "print" });
  await page.goto(`file://${printable}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // The heading joins its opener page, after « § NN » (the source keeps it first for the contents).
  await page.evaluate(() => {
    for (const section of document.querySelectorAll("section.chapter")) {
      const h1 = section.querySelector(":scope > h1");
      const no = section.querySelector(":scope > div.opener div.opener-no");
      if (h1 && no) no.after(h1);
    }
  });
  const fitted = await page.evaluate(fitPictures, { pageHeight: TEXT_BLOCK.height * px, mm: px });
  const pdf = join(dir, `${name}.pdf`);
  const print = () =>
    page.pdf({ path: pdf, format: "A4", tagged: true, outline: true, printBackground: true, preferCSSPageSize: true });
  await print();
  // Then the renderer's own cut, read back: a picture still pushed to the next page (Chromium keeps a heading with its text, three
  // lines together…) is shrunk to the room it left, measured in the PDF, or the text that follows it flows into that room. Up to
  // four passes; the layout guard (verifyBook) judges the last one.
  for (let pass = 0; pass < 4; pass++) {
    const pushed = pushedPictures(await readPages(readFileSync(pdf)));
    if (pushed.length === 0) break;
    const changed = await page.evaluate(placePictures, { pushed, ptToPx: px / MM, mm: px, slack: 8 + 4 * pass });
    fitted.repaired = (fitted.repaired ?? 0) + changed;
    if (changed === 0) break;
    await print();
  }
  await page.close();
  return { pdf, printable, fitted };
}

/** One book: its source HTML, covers, EPUB and PDF in `dir`; returns the files' names. */
async function makeBook(browser, book, chapters, dir) {
  const t = message(book.locale);
  const parts = await loadParts(browser, book, chapters, dir);
  const single = book.key !== SERIES;
  const title = single ? parts[0].title : t.home.title;
  const labels = {
    lang: book.locale,
    title,
    readOnline: t.downloads.readOnline,
    storyHeading: t.downloads.storyHeading,
    chapterWord: t.downloads.chapterWord,
  };
  const name = bookName(book.key, book.locale);
  const source = join(dir, `${name}.source.html`);
  const sortedAll = chapters.filter((c) => c.locale === book.locale).sort((a, b) => a.chapter - b.chapter);
  writeFileSync(
    source,
    bookSource({ chapters: parts, labels, all: single ? sortedAll.map((c) => ({ ...c, url: urlOf(c) })) : undefined }),
  );

  const { ebookCover, printCover } = await drawCovers(browser, { book, t, parts, single, title, name, dir });

  const { common, epub } = buildEpub({ book, t, parts, single, title, name, dir, ebookCover, source });

  const { pdf, printable, fitted } = await buildPdf(browser, {
    t,
    single,
    title,
    name,
    dir,
    common,
    source,
    printCover,
  });
  return { epub, pdf, parts, source: printable, series: !single, fitted };
}

/** The EPUB's checks: chapters, pictures described, language, accessibility metadata, cover, fonts, contents. */
function epubChecks(book, made) {
  const problems = [];
  const text = run("unzip", ["-p", made.epub, "*.xhtml"]);
  const missing = missingChapters(text, made.parts);
  if (missing.length > 0) problems.push(`epub lacks ${missing.join(" | ")}`);
  if (imagesWithoutAlt(text).length > 0) problems.push("epub has a picture without alt");
  const opf = run("unzip", ["-p", made.epub, "*.opf"]);
  if (!opf.includes(`<dc:language>${book.locale}</dc:language>`)) problems.push("epub has no language");
  if (!opf.includes("schema:accessibilityFeature")) problems.push("epub has no accessibility metadata");
  if (!opf.includes("cover-image")) problems.push("epub has no cover");
  const listing = run("unzip", ["-l", made.epub]);
  const pictures = (listing.match(/EPUB\/media\/\S+\.jpe?g/g) ?? []).length;
  if (pictures < made.parts.length)
    problems.push(`epub carries ${pictures} picture(s), at least ${made.parts.length} expected`);
  if (!listing.includes("EPUB/fonts/")) problems.push("epub embeds no font");
  for (const p of orderProblems(readFileSync(made.source, "utf8"))) problems.push(`order: ${p}`);
  const navText = run("unzip", ["-p", made.epub, "*nav.xhtml"]);
  for (const p of orderProblems(navText.replaceAll(/<a\b[^>]*>/g, "<h1>"))) problems.push(`epub toc ${p}`);
  if (!text.includes("<nav") || !text.includes('epub:type="toc"')) problems.push("epub has no table of contents");
  return problems;
}

/** EPUBCheck, when its jar is configured. */
function epubcheckProblems(made, jar) {
  if (!jar) return [];
  const r = spawnSync(JAVA, ["-jar", jar, "--failonwarnings", "--quiet", made.epub], { encoding: "utf8" });
  return r.status === 0 ? [] : [`epubcheck: ${(r.stdout + r.stderr).slice(0, 900)}`];
}

/** The PDF's checks: its source holds every chapter, it is tagged and tells its language, its layout is right page by page. */
async function pdfChecks(book, made) {
  const problems = [];
  const gone = missingChapters(readFileSync(made.source, "utf8"), made.parts);
  if (gone.length > 0) problems.push(`pdf source lacks ${gone.join(" | ")}`);
  for (const p of pdfProblems(readFileSync(made.pdf), { lang: book.locale, pages: made.parts.length + 1 }))
    problems.push(`pdf ${p}`);
  // The layout, page by page: no (nearly) blank page, every caption right under its picture.
  for (const p of await pdfLayoutProblems(readFileSync(made.pdf))) problems.push(`pdf layout: ${p}`);
  return problems;
}

/** The checks of a made book: every chapter is in each file, the pictures are described, the PDF is tagged and tells its language. */
async function verifyBook(book, made) {
  const jar = process.env.EPUBCHECK_JAR;
  return [...epubChecks(book, made), ...epubcheckProblems(made, jar), ...(await pdfChecks(book, made))];
}

async function generate() {
  const chapters = await readChapters();
  const only = arg("only", "");
  // `--only en/story,fr/why-krizaka`: make some books only (a check of the layout while it is being worked on; never recorded).
  const books = planBooks(chapters).filter((b) => !only || only.split(",").includes(bookId(b)));
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const files = {};
  const failures = [];
  try {
    for (const book of books) {
      const made = await makeBook(browser, book, chapters, outDir);
      const problems = await verifyBook(book, made);
      console.log(`${bookId(book)}: ${JSON.stringify(made.fitted)}`);
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
