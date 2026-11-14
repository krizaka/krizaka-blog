import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { latestChapter, latestFeatured, storyRows } from "../lib/home.ts";

/* The home is the story (krizaka-blog#123): the title and one sentence (the notes from building Krizaka, in Oussama's voice),
   Featured (one card: the latest chapter), every chapter in reading order 1 → N with the latest marked « New », then « The basics »
   as quiet links and the newsletter line. The built page is checked too (scripts/check-meta.mjs homeProblems, run on out/ by CI). */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };
const home = read("app/components/pages/HomePage.tsx");

const ch = (chapter, publishedAt, extra = {}) => ({
  slug: `c${chapter}`,
  chapter,
  title: `C${chapter}`,
  date: publishedAt.slice(0, 10),
  publishedAt,
  period: "2026-10-16",
  versus: { faced: "a", built: "b" },
  ...extra,
});

test("the newest chapter is Featured; the others follow newest first (by number), Featured not repeated", () => {
  const list = [
    ch(3, "2026-10-20T09:00:00-04:00"),
    ch(1, "2026-10-23T09:00:00-04:00"),
    ch(2, "2026-10-21T09:00:00-04:00"),
  ];
  const featured = latestChapter(list);
  const rows = storyRows(list, featured);
  assert.equal(featured.chapter, 1, "the one that went out last is Featured, whatever its number");
  assert.deepEqual(
    rows.map((r) => r.chapter.chapter),
    [3, 2],
    "the others, newest first",
  );
  assert.equal(rows.filter((r) => r.isNew).length, 0);
});

test("of two chapters out at the same minute, the later in the story is the latest; no chapter, no Featured", () => {
  const list = [ch(7, "2026-10-24T09:00:00-04:00"), ch(8, "2026-10-24T09:00:00-04:00")];
  const featured = latestChapter(list);
  assert.equal(featured.chapter, 8);
  assert.deepEqual(
    storyRows(list, featured).map((r) => r.chapter.chapter),
    [7],
  );
  assert.equal(latestChapter([]), undefined);
  assert.deepEqual(storyRows([]), []);
});

test("today's chapters: chapter 29 Featured, then 28 → 1 in both languages", () => {
  for (const locale of ["en", "fr"]) {
    const list = readdirSync(new URL("../content/chapters/", import.meta.url))
      .filter((f) => f.endsWith(`.${locale}.mdx`))
      .map((f) => ({ slug: f.split(".")[0], ...matter(read(`content/chapters/${f}`)).data }))
      .filter((c) => c.draft !== true)
      .map((c) => ({ ...c, date: String(c.date instanceof Date ? c.date.toISOString().slice(0, 10) : c.date) }));
    const featured = latestChapter(list);
    const rows = storyRows(list, featured);
    assert.deepEqual(
      rows.map((r) => r.chapter.chapter),
      [28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      locale,
    );
    assert.equal(rows.length + 1, 29, `${locale}: twenty-nine chapters, one of them Featured`);
    assert.equal(featured.slug, "how-our-agent-teams-talk", `${locale}: the latest chapter is Featured`);
  }
});

test("the home renders the sentence, its byline, Featured, the chapters, the basics and the newsletter line — in that order", () => {
  const order = ["h.lead", "h.byline", "h.featuredTitle", "h.chaptersTitle", "h.basicsTitle", "<NewsletterSection"].map(
    (k) => home.indexOf(k),
  );
  for (const [i, at] of order.entries()) assert.ok(at > 0 && (i === 0 || at > order[i - 1]), `piece ${i} in order`);
  assert.match(
    home,
    /featuredItem\.kind === "chapter"[\s\S]*?href=\{href\(featuredItem\.item\.slug\)\}[\s\S]*?cta=\{h\.readChapter\}/,
    "Featured chapter: chapter path, « Read the chapter »",
  );
  assert.match(
    home,
    /featuredItem\.kind === "post"[\s\S]*?postPath[\s\S]*?cta=\{h\.readPost\}/,
    "Featured post: post path, read post link",
  );
  assert.match(
    home,
    /<ChapterIndex[\s\S]*?chapters=\{rows\.map\(/,
    "the chapters are @krizaka/ui's ChapterIndex, in the rows' reading order: a timeline, not a feed",
  );
  assert.match(home, /newLabel=\{h\.new\}[\s\S]*?isNew,/, "the latest is marked « New »");
  assert.match(
    home,
    /number: chapterNumber\(c\.chapter\)[\s\S]*?title: c\.title[\s\S]*?href: href\(c\.slug\)/,
    "the number in the margin, the title the link",
  );
  // The album (Oussama, 2026-10-24; krizaka-ui#621): each chapter is its cover as a taped print, the title and ONE short line — what we built.
  assert.match(
    home,
    /<ChapterIndex[\s\S]*?variant="album"/,
    "the chapters are the album: the taped print, a title and one line, alternating",
  );
  assert.match(
    home,
    /detail: upperFirst\(c\.versus\.built\)/,
    "one short line per chapter: what we built (the faced → built pair stays on the chapter's head)",
  );
  assert.match(
    home,
    /cover: c\.cover \? albumCover\(coverOf\(c\.cover\)\)/,
    "the chapter's own cover, with its intrinsic size (no layout shift)",
  );
  assert.doesNotMatch(
    home,
    /c\.versus\.faced|LinkCard|<Badge/,
    "no box, and the faced line stays on the chapter's head",
  );
  assert.match(home, /formatPeriod\(c\.period, locale\)/, "and its period");
});

test("the removed home blocks are gone: latest posts, series, who writes, where the work lives, the topics", () => {
  assert.doesNotMatch(
    home,
    /TopicFilter|AuthorNote|<PostList|seriesTitle|elsewhereTitle|KRIZAKA_URL|UI_URL|JAVA_URL|featuredPosts|\/story"\)/,
  );
  assert.equal(
    (home.match(/<Section\b/g) ?? []).length,
    4,
    "four sections: Featured, the chapters, the signature, the basics",
  );
});

test("only @krizaka/ui blocks and the site's own modules: Krizaka first", () => {
  const imports = [...home.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const i of imports)
    assert.ok(
      i.startsWith("@krizaka/") || i.startsWith("@/") || i.startsWith("./") || i.startsWith("../") || i === "next/link",
      `${i} is a Krizaka block or the site's own`,
    );
});

for (const locale of ["en", "fr"]) {
  test(`${locale}: the home's words — the title, one sentence in Oussama's voice (« I », never « we » or a slogan), Featured, the chapters, the basics`, () => {
    const h = messages[locale].home;
    for (const k of [
      "eyebrow",
      "title",
      "lead",
      "byline",
      "featuredTitle",
      "readChapter",
      "chaptersTitle",
      "chaptersLead",
      "new",
      "basicsTitle",
      "basicsLead",
      "seoTitle",
      "seoDescription",
    ])
      assert.ok(h[k]?.trim(), `${locale}: home.${k}`);
    assert.equal((h.lead.match(/[.!?](\s|$)/g) ?? []).length, 1, "one sentence");
    assert.match(
      h.lead,
      locale === "fr" ? /\bmes notes de construction\b/ : /\bmy notes from building Krizaka\b/,
      "it says these are the building notes",
    );
    assert.match(h.lead, locale === "fr" ? /\bj[’']/ : /\bI\b/, "first person, Oussama's voice");
    assert.doesNotMatch(h.lead, /Sober|Sobre|factual|factuel|checked against|vérifié/i, "not a slogan");
    assert.ok([...h.seoDescription].length <= 155 && [...h.seoTitle].length <= 60);
    for (const k of ["latest", "seriesTitle", "elsewhereTitle", "readStory", "allTopics", "versus"])
      assert.equal(h[k], undefined, `${locale}: home.${k} is gone`);
    assert.ok(h.readPost?.trim(), `${locale}: home.readPost`);
  });
}

const post = (slug, publishedAt) => ({ slug, publishedAt, date: publishedAt.slice(0, 10) });

test("latestFeatured: a post newer than all chapters is Featured", () => {
  const chapters = [ch(26, "2026-10-30T09:00:00-04:00"), ch(25, "2026-10-15T09:00:00-04:00")];
  const posts = [post("the-machine", "2026-11-08T12:00:00-05:00")];
  const f = latestFeatured(chapters, posts);
  assert.equal(f?.kind, "post");
  assert.equal(f?.item.slug, "the-machine");
});

test("latestFeatured: a chapter newer than all posts is Featured", () => {
  const chapters = [ch(26, "2026-11-09T10:00:00-05:00"), ch(25, "2026-10-15T09:00:00-04:00")];
  const posts = [post("the-machine", "2026-11-08T12:00:00-05:00")];
  const f = latestFeatured(chapters, posts);
  assert.equal(f?.kind, "chapter");
  assert.equal(f?.item.chapter, 26);
});

test("latestFeatured: when a post is Featured, every chapter stays in storyRows (chapter 26 must not disappear)", () => {
  const chapters = [ch(26, "2026-10-30T09:00:00-04:00"), ch(25, "2026-10-15T09:00:00-04:00")];
  const posts = [post("the-machine", "2026-11-08T12:00:00-05:00")];
  const f = latestFeatured(chapters, posts);
  assert.equal(f?.kind, "post");
  const rows = storyRows(chapters, f?.kind === "chapter" ? f.item : undefined);
  assert.deepEqual(
    rows.map((r) => r.chapter.chapter),
    [26, 25],
    "every chapter in the list when a post is Featured",
  );
});

test("latestFeatured: no chapters and no posts → undefined; no posts → chapter wins", () => {
  assert.equal(latestFeatured([], []), undefined);
  const chapters = [ch(3, "2026-10-20T09:00:00-04:00")];
  const f = latestFeatured(chapters, []);
  assert.equal(f?.kind, "chapter");
  assert.equal(f?.item.chapter, 3);
});

test("the start line: chapter 1 and the basics in both languages, and the download row's label is a note, not a heading (krizaka-internal#3600)", () => {
  assert.match(home, /className="bl-home-start"/);
  assert.match(home, /href=\{href\(first\.slug\)\}/);
  assert.match(home, /href="#basics"/);
  assert.match(home, /chapters\.find\(\(c\) => c\.chapter === 1\)/);
  assert.equal(
    messages.en.home.startPre +
      messages.en.home.startChapter +
      messages.en.home.startMid +
      messages.en.home.startBasics +
      messages.en.home.startPost,
    "New here? Start with chapter 1, or with the basics: four short reads.",
  );
  assert.equal(
    messages.fr.home.startPre +
      messages.fr.home.startChapter +
      messages.fr.home.startMid +
      messages.fr.home.startBasics +
      messages.fr.home.startPost,
    "Nouveau ici ? Commencez par le chapitre 1, ou par les bases : quatre lectures courtes.",
  );
  const take = read("app/components/TakeStory.tsx");
  const bookplate = take.slice(take.indexOf('<aside className="bl-take"'));
  assert.ok(!/<h2/.test(bookplate), "the home's download label is a p");
  assert.match(bookplate, /<p id="bl-take-story" className="bl-take-label">/);
});

/* The old code names leave the chapter titles (founder, 2026-11-14: commercial names everywhere): the table is
   docs/standards/renames-2026-11-06.md of krizaka/.github (yomizaka → Verikora, akinaza → Folioviv, orazaka → Sovkora,
   kachizaka → Kridoc). History keeps them in the slugs and the bodies; a title and its search title never. */
const OLD_NAMES = /orazaka|yomizaka|akinaza|kachizaka/i;
test("no chapter title (nor its search title) carries an old code name", () => {
  const dir = new URL("../content/chapters/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  assert.ok(files.length > 20);
  for (const f of files) {
    const { data } = matter(readFileSync(new URL(f, dir), "utf8"));
    for (const key of ["title", "seoTitle"]) assert.doesNotMatch(String(data[key] ?? ""), OLD_NAMES, `${f}: ${key}`);
  }
});
