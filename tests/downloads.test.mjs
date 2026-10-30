// Downloads (krizaka-blog#211, PR 2): EPUB and PDF of every chapter and of the series. The core (clean, plan, check) and the guard that
// lib/downloads.json names current files for every chapter.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  CDN_FOLDER,
  FORMATS,
  SERIES,
  articleOf,
  bookName,
  bookSource,
  cleanArticle,
  closeOf,
  downloadUrl,
  imagesWithoutAlt,
  manifestProblems,
  missingChapters,
  plain,
  pdfProblems,
  planBooks,
  removeHidden,
  replaceElements,
  sourceHash,
} from "../lib/downloads-core.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("closeOf finds the matching close of nested elements, and not a longer tag name", () => {
  const h = "<div>a<div>b</div><divx>c</divx></div>tail";
  assert.equal(h.slice(0, closeOf(h, "div", 0) + 6), "<div>a<div>b</div><divx>c</divx></div>");
  assert.equal(closeOf("<div>open", "div", 0), -1);
});

test("a diagram or a clip stands for its label, never a silent hole; a decorative one is dropped", () => {
  const svg =
    '<p>a</p><svg role="img" aria-label="Flow: A then B"><g><text>A</text></g></svg><svg aria-hidden="true"><g/></svg><p>z</p>';
  const out = replaceElements(svg, "svg", (open) => (open.includes('role="img"') ? "<i>kept</i>" : ""));
  assert.equal(out, "<p>a</p><i>kept</i><p>z</p>");
  const cleaned = cleanArticle(
    '<article><video aria-label="Video: the Today tab"><source src="x.mp4"></video></article>',
  );
  assert.match(cleaned, /<em>Video: the Today tab<\/em>/);
  assert.doesNotMatch(cleaned, /<video|<source/);
});

test("cleanArticle drops script, button and blur placeholders, keeps alt, and makes links absolute", () => {
  const html =
    '<article class="bl-article"><button>Save</button><script>1</script><noscript><img src="n.gif"></noscript>' +
    '<div aria-hidden="true"><span>Round 1</span></div><img src="https://cdn/x.webp" alt="A desk" style="background-image:url(data:image/webp;base64,AAA)" sizes="1px" srcSet="a 1w">' +
    '<a href="/story/x/">x</a><a href="#id">y</a></article>';
  const out = cleanArticle(html);
  assert.doesNotMatch(out, /button|script|noscript|Round 1|data:image|style=|srcSet/);
  assert.match(out, /<img src="https:\/\/cdn\/x\.webp" alt="A desk">/);
  assert.match(out, /href="https:\/\/blog\.krizaka\.com\/story\/x\/"/);
  assert.match(out, /href="#id"/);
  assert.deepEqual(imagesWithoutAlt(out), []);
  assert.equal(imagesWithoutAlt('<img src="x">').length, 1);
  assert.equal(imagesWithoutAlt('<img src="x" alt="">').length, 0);
});

test("removeHidden removes the hidden elements of one tag, with their content, and no other", () => {
  assert.equal(
    removeHidden('<p>a</p><div aria-hidden="true"><div>in</div></div><div>keep</div>', "div"),
    "<p>a</p><div>keep</div>",
  );
});

test("articleOf reads the chapter's body out of its exported page", () => {
  const page =
    '<html><main><article class="bl-article"><p>one</p><article>nested</article></article><aside>no</aside></main></html>';
  assert.equal(articleOf(page), '<article class="bl-article"><p>one</p><article>nested</article></article>');
  assert.equal(articleOf("<html></html>"), undefined);
});

test("the source hash follows the text and the file name, not the order they are given in", () => {
  const a = { name: "a.en", text: "one" };
  const b = { name: "b.en", text: "two" };
  assert.equal(sourceHash([a, b]), sourceHash([b, a]));
  assert.notEqual(sourceHash([a, b]), sourceHash([a, { ...b, text: "two!" }]));
  assert.match(sourceHash([a]), /^[0-9a-f]{12}$/);
});

test("a download's URL is the hashed object cdn-assets writes (name-lang.hash.ext)", () => {
  assert.equal(bookName(SERIES, "fr"), "story-fr");
  assert.equal(
    downloadUrl("why-krizaka", "en", "epub", "0123456789"),
    `https://krizaka-assets.b-cdn.net/${CDN_FOLDER}/why-krizaka-en.0123456789.epub`,
  );
  assert.match(bookName("why-krizaka", "en"), /^[a-z0-9_-]+$/, "cdn-assets refuses a dot in a name");
});

const chapters = [
  { slug: "one", locale: "en", chapter: 1, text: "1" },
  { slug: "two", locale: "en", chapter: 2, text: "2" },
  { slug: "one", locale: "fr", chapter: 1, text: "un" },
];

test("planBooks makes the series of each language, then each chapter", () => {
  const books = planBooks(chapters);
  assert.deepEqual(
    books.map((b) => `${b.locale}/${b.key}`),
    ["en/story", "en/one", "en/two", "fr/story", "fr/one"],
  );
  assert.deepEqual(books[0].slugs, ["one", "two"]);
  assert.equal(books[1].source, sourceHash([{ name: "one.en", text: "1" }]));
});

test("manifestProblems names a missing, a stale and a leftover book, and a missing format", () => {
  const books = planBooks(chapters);
  const file = { hash: "0123456789", bytes: 10 };
  const good = Object.fromEntries(
    books.map((b) => [`${b.locale}/${b.key}`, { source: b.source, files: { epub: file, pdf: file } }]),
  );
  assert.deepEqual(manifestProblems({ books: good }, books), []);
  const broken = structuredClone(good);
  delete broken["en/two"];
  broken["en/one"].source = "old";
  delete broken["fr/one"].files.pdf;
  broken["fr/gone"] = good["fr/one"];
  const problems = manifestProblems({ books: broken }, books).join("\n");
  assert.match(problems, /en\/two: no files/);
  assert.match(problems, /en\/one: its text changed/);
  assert.match(problems, /fr\/one: no pdf/);
  assert.match(problems, /fr\/gone: a book of no chapter/);
  assert.equal(manifestProblems(undefined, books).length, books.length);
});

test("every chapter must be in a book: wrapped lines, entities and markup do not hide a title", () => {
  const list = [
    { chapter: 1, title: "Why I am building Krizaka" },
    { chapter: 2, title: "L'erreur & l'éditeur" },
  ];
  const text = "<h1>01 · Why I am\n   building <em>Krizaka</em></h1><h1>02 · L&#39;erreur &amp; l&#x2019;x</h1>";
  assert.deepEqual(missingChapters(text, list), ["02 · L'erreur & l'éditeur"]);
  assert.deepEqual(missingChapters("<h1>01 · Why I am building Krizaka</h1>", list.slice(0, 1)), []);
});

test("the book's source is a language-tagged page with each chapter as a section, and the links to the others on a single chapter", () => {
  const parts = [
    {
      slug: "one",
      chapter: 1,
      title: "One <b>",
      description: "D",
      article: "<p>body</p>",
      url: "https://blog.krizaka.com/story/one/",
    },
  ];
  const labels = { lang: "fr", title: "T", readOnline: "À lire en ligne :", storyHeading: "Toute l'histoire" };
  const html = bookSource({ chapters: parts, labels, all: parts });
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /<section id="ch-one">\n<h1>01 · One &lt;b&gt;<\/h1>/);
  assert.match(html, /À lire en ligne : <a href="https:\/\/blog\.krizaka\.com\/story\/one\/">/);
  assert.match(html, /<section id="the-story">/);
  assert.doesNotMatch(bookSource({ chapters: parts, labels }), /the-story/);
});

test("a PDF must be tagged, titled, in its language and have its pages", () => {
  const good = Buffer.from(
    "%PDF-1.7\n<</Type /StructTreeRoot>>\n/Lang (fr-CA)\n<</Title (T)>>\n<</Type /Page>>\n<</Type /Page>>\n<</Type /Pages>>",
  );
  assert.deepEqual(pdfProblems(good, { lang: "fr", pages: 2 }), []);
  const bare = Buffer.from("%PDF-1.7\n<</Type /Page>>");
  const problems = pdfProblems(bare, { lang: "en", pages: 3 }).join("\n");
  assert.match(problems, /not tagged/);
  assert.match(problems, /no language tag/);
  assert.match(problems, /no title/);
  assert.match(problems, /1 page\(s\), at least 3/);
});

test("lib/downloads.json names current EPUB and PDF files for the series and every chapter (run scripts/gen-downloads.mjs, upload, record)", async () => {
  const { default: matter } = await import("gray-matter");
  const dir = new URL("../content/chapters/", import.meta.url);
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const text = readFileSync(new URL(f, dir), "utf8");
      const [, slug, locale] = f.match(/^(.+)\.(en|fr)\.mdx$/);
      return {
        slug,
        locale,
        text,
        chapter: Number(matter(text).data.chapter),
        draft: matter(text).data.draft === true,
      };
    })
    .filter((c) => !c.draft);
  const problems = manifestProblems(JSON.parse(read("lib/downloads.json")), planBooks(entries));
  assert.deepEqual(problems, []);
});

test("the site links the downloads on each chapter, on the home and in the three feeds; CI makes and checks them", () => {
  assert.match(
    read("app/components/pages/ChapterPage.tsx"),
    /<TakeStory locale=\{locale\} bookKey=\{chapter\.slug\} compact \/>/,
  );
  assert.match(read("app/components/pages/HomePage.tsx"), /<TakeStory locale=\{locale\} \/>/);
  const feeds = read("lib/feeds.ts");
  assert.match(feeds, /<enclosure url=/);
  assert.match(feeds, /rel="enclosure"/);
  assert.match(feeds, /attachments:/);
  assert.match(read("scripts/ci-after-build.sh"), /scripts\/gen-downloads\.mjs/);
  assert.deepEqual([...FORMATS], ["epub", "pdf"]);
});

test("plain drops every tag, nested or half-written, and reads the entities", () => {
  assert.equal(plain("<p>a <b>b</b> &amp; c</p>"), "a b & c");
  assert.equal(plain("<<script>x</script>y"), "xy");
  assert.equal(plain("<a\nhref='x'>t</a>"), "t");
});
