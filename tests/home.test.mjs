import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { latestChapter, storyRows } from "../lib/home.ts";

/* The home is the story (krizaka-blog#123): the title and one sentence (the notes from building Krizaka, in Oussama's voice),
   Featured (one card: the latest chapter), every chapter in reading order 1 → N with the latest marked « New », then « The basics »
   as quiet links and the newsletter line. The built page is checked too (scripts/check-meta.mjs homeProblems, run on out/ by CI). */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };
const home = read("app/components/pages/HomePage.tsx");

const ch = (chapter, publishedAt, extra = {}) => ({ slug: `c${chapter}`, chapter, title: `C${chapter}`, date: publishedAt.slice(0, 10), publishedAt, period: "2026-10-16", versus: { faced: "a", built: "b" }, ...extra });

test("the chapters are in reading order (their numbers, never their dates), the latest marked new", () => {
  const list = [ch(3, "2026-10-20T09:00:00-04:00"), ch(1, "2026-10-23T09:00:00-04:00"), ch(2, "2026-10-21T09:00:00-04:00")];
  const rows = storyRows(list);
  assert.deepEqual(rows.map((r) => r.chapter.chapter), [1, 2, 3]);
  assert.deepEqual(rows.filter((r) => r.isNew).map((r) => r.chapter.chapter), [1], "the one that went out last is new, whatever its number");
  assert.equal(latestChapter(list).chapter, 1);
});

test("of two chapters out at the same minute, the later in the story is the latest; no chapter, no Featured", () => {
  const list = [ch(7, "2026-10-24T09:00:00-04:00"), ch(8, "2026-10-24T09:00:00-04:00")];
  assert.equal(latestChapter(list).chapter, 8);
  assert.equal(storyRows(list).filter((r) => r.isNew).length, 1);
  assert.equal(latestChapter([]), undefined);
  assert.deepEqual(storyRows([]), []);
});

test("today's chapters: 1 → 8 in both languages, chapter 8 Featured and new", () => {
  for (const locale of ["en", "fr"]) {
    const list = readdirSync(new URL("../content/chapters/", import.meta.url))
      .filter((f) => f.endsWith(`.${locale}.mdx`))
      .map((f) => ({ slug: f.split(".")[0], ...matter(read(`content/chapters/${f}`)).data }))
      .filter((c) => c.draft !== true)
      .map((c) => ({ ...c, date: String(c.date instanceof Date ? c.date.toISOString().slice(0, 10) : c.date) }));
    const rows = storyRows(list);
    assert.deepEqual(rows.map((r) => r.chapter.chapter), list.map((c) => c.chapter).sort((a, b) => a - b), locale);
    assert.equal(rows[0].chapter.chapter, 1);
    assert.equal(latestChapter(list).slug, "building-with-agents", `${locale}: the latest chapter is Featured`);
  }
});

test("the home renders the sentence, its byline, Featured, the chapters, the basics and the newsletter line — in that order", () => {
  const order = ["h.lead", "h.byline", "h.featuredTitle", "h.chaptersTitle", "h.basicsTitle", "<NewsletterSection"].map((k) => home.indexOf(k));
  for (const [i, at] of order.entries()) assert.ok(at > 0 && (i === 0 || at > order[i - 1]), `piece ${i} in order`);
  assert.match(home, /<PostCard[\s\S]*?feature[\s\S]*?href=\{href\(featured\.slug\)\}[\s\S]*?cta=\{h\.readChapter\}/, "Featured is the latest chapter's card, with « Read the chapter »");
  assert.match(home, /<ChapterIndex[\s\S]*?chapters=\{rows\.map\(/, "the chapters are @krizaka/ui's ChapterIndex, in the rows' reading order: a timeline, not a feed");
  assert.match(home, /newLabel=\{h\.new\}[\s\S]*?isNew,/, "the latest is marked « New »");
  assert.match(home, /number: chapterNumber\(c\.chapter\)[\s\S]*?title: c\.title[\s\S]*?href: href\(c\.slug\)/, "the number in the margin, the title the link");
  // The album (Oussama, 2026-10-24; krizaka-ui#621): each chapter is its cover as a taped print, the title and ONE short line — what we built.
  assert.match(home, /<ChapterIndex[\s\S]*?variant="album"/, "the chapters are the album: the taped print, a title and one line, alternating");
  assert.match(home, /detail: upperFirst\(c\.versus\.built\)/, "one short line per chapter: what we built (the faced → built pair stays on the chapter's head)");
  assert.match(home, /cover: c\.cover \? albumCover\(coverOf\(c\.cover\)\)/, "the chapter's own cover, with its intrinsic size (no layout shift)");
  assert.doesNotMatch(home, /c\.versus\.faced|LinkCard|<Badge/, "no box, and the faced line stays on the chapter's head");
  assert.match(home, /formatPeriod\(c\.period, locale\)/, "and its period");
});

test("the removed home blocks are gone: latest posts, series, who writes, where the work lives, the topics", () => {
  assert.doesNotMatch(home, /TopicFilter|AuthorNote|<PostList|seriesTitle|elsewhereTitle|KRIZAKA_URL|UI_URL|JAVA_URL|featuredPosts|\/story"\)/);
  assert.equal((home.match(/<Section\b/g) ?? []).length, 3, "three sections: Featured, the chapters, the basics");
});

test("only @krizaka/ui blocks and the site's own modules: Krizaka first", () => {
  const imports = [...home.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const i of imports) assert.ok(i.startsWith("@krizaka/") || i.startsWith("@/") || i.startsWith("./") || i.startsWith("../") || i === "next/link", `${i} is a Krizaka block or the site's own`);
});

for (const locale of ["en", "fr"]) {
  test(`${locale}: the home's words — the title, one sentence in Oussama's voice (« I », never « we » or a slogan), Featured, the chapters, the basics`, () => {
    const h = messages[locale].home;
    for (const k of ["eyebrow", "title", "lead", "byline", "featuredTitle", "readChapter", "chaptersTitle", "chaptersLead", "new", "basicsTitle", "basicsLead", "seoTitle", "seoDescription"]) assert.ok(h[k]?.trim(), `${locale}: home.${k}`);
    assert.equal((h.lead.match(/[.!?](\s|$)/g) ?? []).length, 1, "one sentence");
    assert.match(h.lead, locale === "fr" ? /\bmes notes de construction\b/ : /\bmy notes from building Krizaka\b/, "it says these are the building notes");
    assert.match(h.lead, locale === "fr" ? /\bj[’']/ : /\bI\b/, "first person, Oussama's voice");
    assert.doesNotMatch(h.lead, /Sober|Sobre|factual|factuel|checked against|vérifié/i, "not a slogan");
    assert.ok([...h.seoDescription].length <= 155 && [...h.seoTitle].length <= 60);
    for (const k of ["latest", "seriesTitle", "elsewhereTitle", "readStory", "allTopics", "versus"]) assert.equal(h[k], undefined, `${locale}: home.${k} is gone`);
  });
}
