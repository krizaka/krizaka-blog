import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { checkChapters, chapterProblems, internalLinkProblems, readContext } from "../scripts/content-rules.mjs";
import { headingsOf, rehypeRounds } from "../lib/reading.ts";

const root = new URL("..", import.meta.url).pathname;
const CHAPTERS = join(root, "content/chapters");
const POSTS = join(root, "content/posts");
const read = (f) => matter(readFileSync(join(CHAPTERS, f), "utf8"));

test("the story's chapters follow the rules: a post's, plus chapter, period, sources, versus and stats (check-content)", () => {
  const { files, problems } = checkChapters(CHAPTERS, POSTS, readContext(root));
  assert.deepEqual(problems, []);
  assert.ok(files.length >= 4);
});

test("chapters 1, 2, 5 and 6 exist in FR and EN, with the same number, period and sources", () => {
  for (const [slug, n] of [["why-krizaka", 1], ["an-engine-on-a-laptop", 2], ["one-interface-everywhere", 5], ["the-first-products", 6]]) {
    const fr = read(`${slug}.fr.mdx`).data;
    const en = read(`${slug}.en.mdx`).data;
    assert.equal(fr.chapter, n, slug);
    assert.equal(en.chapter, n, slug);
    assert.match(fr.period, /^\d{4}-\d{2}-\d{2}(\/\d{4}-\d{2}-\d{2})?$/);
    assert.equal(en.period, fr.period);
    assert.deepEqual(en.sources, fr.sources);
    assert.equal(fr.draft, false);
  }
});

test("every chapter's sources are posts of content/posts or retired posts (lib/redirects.json), in its language", () => {
  const retired = Object.keys(JSON.parse(readFileSync(new URL("../lib/redirects.json", import.meta.url), "utf8")));
  for (const f of readdirSync(CHAPTERS).filter((f) => f.endsWith(".mdx"))) {
    const locale = f.match(/\.(en|fr)\.mdx$/)[1];
    const { sources } = read(f).data;
    assert.ok(Array.isArray(sources) && sources.length > 0, f);
    for (const s of sources) assert.ok(existsSync(join(POSTS, `${s}.${locale}.mdx`)) || retired.includes(s), `${f}: source ${s}`);
  }
});

const good = {
  title: "T",
  description: "D",
  date: "2026-10-23",
  draft: true,
  chapter: 1,
  period: "2026-10-16/2026-10-17",
  sources: ["a"],
  versus: { faced: "x", built: "y" },
  stats: [{ value: "62 s", label: "an image", section: "Round one" }],
};
const body = "Text.\n\n## Round one\n\nIt takes 62 seconds.\n";
const slugs = new Set(["en:a", "fr:a"]);

test("a well-formed chapter has no problem", () => assert.deepEqual(chapterProblems("c.en.mdx", good, body, undefined, slugs), []));

test("a chapter without its story's fields, or with a source that is not a post, is refused", () => {
  const p = (data) => chapterProblems("c.en.mdx", { ...good, ...data }, body, undefined, slugs).join("\n");
  assert.match(p({ chapter: undefined }), /"chapter"/);
  assert.match(p({ chapter: 0 }), /"chapter"/);
  assert.match(p({ period: "October" }), /"period"/);
  assert.match(p({ period: "2026-10-17/2026-10-16" }), /ends before/);
  assert.match(p({ sources: [] }), /"sources"/);
  assert.match(p({ sources: ["gone"] }), /source "gone"/);
  assert.match(p({ versus: { faced: "x" } }), /versus\.built/);
  assert.match(p({ series: "measured", part: 1 }), /no "series"/);
});

test("a chapter period contains real calendar dates, including both ends of a range", () => {
  const p = (period) => chapterProblems("c.en.mdx", { ...good, period }, body, undefined, slugs).join("\n");
  assert.match(p("2026-13-01"), /real calendar dates/);
  assert.match(p("2026-02-30"), /real calendar dates/);
  assert.match(p("2024-02-29/2026-02-30"), /real calendar dates/);
  assert.doesNotMatch(p("2024-02-29/2026-03-01"), /period/);
});

test("a stat is a figure the chapter already gives, from one of its sections, four at most", () => {
  const p = (stats) => chapterProblems("c.en.mdx", { ...good, stats }, body, undefined, slugs).join("\n");
  assert.match(p([{ value: "63 s", label: "l", section: "Round one" }]), /gives 63/);
  assert.match(chapterProblems("c.en.mdx", { ...good, stats: [{ value: "62 s", label: "l", section: "Round one" }] }, "## Round one\n162 seconds", undefined, slugs).join("\n"), /gives 62/);
  assert.match(chapterProblems("c.en.mdx", { ...good, stats: [{ value: "3.99", label: "l", section: "Round one" }] }, "## Round one\n13.99", undefined, slugs).join("\n"), /gives 3\.99/);
  assert.match(p([{ value: "62 s", label: "l", section: "Nowhere" }]), /not an h2/);
  assert.match(p(Array(5).fill(good.stats[0])), /at most 4/);
});

test("no dead internal link: a link leads to a post or a chapter of that language, or a page of the site", () => {
  const known = new Set(["posts:en:a", "posts:fr:a", "story:en:c", "story:fr:c"]);
  assert.deepEqual(internalLinkProblems("x.en.mdx", "[a](/posts/a/) [b](/fr/posts/a) [c](/story/c/#x) [d](/fr/about/) [e](/) [f](https://x.y/z) [g](/basics/) [h](/fr/newsletter/)", known), []);
  assert.match(internalLinkProblems("x.en.mdx", "[a](/posts/gone/)", known)[0], /\/posts\/gone/);
  assert.match(internalLinkProblems("x.en.mdx", "[a](/fr/story/missing/)", known)[0], /missing/);
  assert.match(internalLinkProblems("x.en.mdx", "[a](/nowhere/)", known)[0], /nowhere/);
});

test("a body never links to a page the one-page blog removed (krizaka-blog#123): the topics, the series, search, saved, the feed page, the story's old index", () => {
  const known = new Set(["posts:en:a", "story:en:c"]);
  for (const path of ["/tags/", "/tags/ai/", "/fr/tags/ai/", "/series/", "/series/building-orazaka/", "/search/", "/saved/", "/feed/", "/fr/feed/", "/story/"]) {
    assert.equal(internalLinkProblems("x.en.mdx", `[x](${path})`, known).length, 1, `${path} is refused`);
  }
});

test("published chapters cannot link to draft posts or chapters; draft chapters may link to both", () => {
  const known = new Map([
    ["posts:en:published", false],
    ["posts:en:draft-post", true],
    ["story:en:draft-chapter", true],
  ]);
  const links = "[published](/posts/published/) [draft post](/posts/draft-post/) [draft chapter](/story/draft-chapter/)";
  assert.equal(internalLinkProblems("c.en.mdx", links, known, false).length, 2);
  assert.deepEqual(internalLinkProblems("c.en.mdx", links, known, true), []);
});

test("chapter links to the removed topic and series pages are refused, even when a post names that topic", async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "chapter-routes-"));
  const posts = join(dir, "posts");
  const chapters = join(dir, "chapters");
  mkdirSync(posts);
  mkdirSync(chapters);
  for (const locale of ["en", "fr"]) {
    writeFileSync(join(posts, `a.${locale}.mdx`), `---\ntitle: T\ndraft: false\ntags: [ai]\nseries: building-orazaka\n---\n`);
    writeFileSync(join(chapters, `c.${locale}.mdx`), `---\ntitle: T\ndescription: D\ndate: 2026-10-23\ndraft: true\nchapter: 1\nperiod: "2026-10-16"\nsources: [a]\nversus: { faced: x, built: y }\n---\n[Tag](${locale === "fr" ? "/fr" : ""}/tags/ai/) [Series](${locale === "fr" ? "/fr" : ""}/series/building-orazaka/) [Post](${locale === "fr" ? "/fr" : ""}/basics/a/)\n`);
  }
  const { problems } = checkChapters(chapters, posts);
  assert.equal(problems.filter((p) => /\/tags\/ai|\/series\/building-orazaka/.test(p)).length, 4);
  assert.equal(problems.filter((p) => /\/basics\/a/.test(p)).length, 0);
});

test("the story as a whole: each chapter in both languages, numbers from 1 without a gap", async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "chapters-"));
  const posts = join(dir, "posts");
  const chapters = join(dir, "chapters");
  mkdirSync(posts);
  mkdirSync(chapters);
  writeFileSync(join(posts, "a.en.mdx"), "---\ntitle: T\n---\n");
  const fm = (n) => `---\ntitle: T\ndescription: D\ndate: 2026-10-23\ndraft: true\nchapter: ${n}\nperiod: "2026-10-16"\nsources: [a]\nversus: { faced: x, built: y }\n---\nText.\n`;
  writeFileSync(join(chapters, "one.en.mdx"), fm(1));
  writeFileSync(join(chapters, "three.en.mdx"), fm(3));
  const { problems } = checkChapters(chapters, posts);
  assert.ok(problems.some((p) => /one: it must exist in both languages/.test(p)));
  assert.ok(problems.some((p) => /without a gap/.test(p)));
});

test("« Round n » numbers the h2s in order and leaves the heading and its id alone (the redirect anchors stay)", () => {
  const h2 = (text, id) => ({ type: "element", tagName: "h2", properties: { id }, children: [{ type: "text", value: text }] });
  const tree = { type: "root", children: [{ type: "element", tagName: "p", properties: {}, children: [] }, h2("First", "first"), { type: "element", tagName: "h3", properties: {}, children: [] }, h2("Second", "second")] };
  rehypeRounds()(tree);
  const heads = tree.children.filter((c) => c.tagName === "h2");
  assert.deepEqual(heads.map((h) => h.properties), [{ id: "first", dataRound: "1" }, { id: "second", dataRound: "2" }]);
  assert.equal(tree.children[2].properties.dataRound, undefined);
});

test("the redirect anchors planned for the absorbed posts (refonte plan, #108 § 3) are h2 ids of chapter 2", () => {
  assert.ok(headingsOf(read("an-engine-on-a-laptop.en.mdx").content).some((h) => h.id === "from-a-monolith-to-services"));
  assert.ok(headingsOf(read("an-engine-on-a-laptop.fr.mdx").content).some((h) => h.id === "du-monolithe-aux-services"));
});

test("a chapter page exists in both languages: its head and foot are @krizaka/ui's sober chapter blocks, its round markers and stats the arcade's", () => {
  for (const f of ["app/(en)/story/[chapter]/page.tsx", "app/fr/story/[chapter]/page.tsx"]) assert.ok(existsSync(join(root, f)), f);
  const page = readFileSync(join(root, "app/components/pages/ChapterPage.tsx"), "utf8");
  for (const block of ["@krizaka/ui/chapter", "@krizaka/ui/stage-banner", "@krizaka/ui/story.css", "rehypeRounds"]) assert.ok(page.includes(block), block);
  assert.match(page, /<ChapterHead[\s\S]*?period=\{period\}[\s\S]*?readingTime=[\s\S]*?faced=[\s\S]*?built=/, "the head: the period, the reading time, faced → built once");
  assert.match(page, /<ChapterFoot[\s\S]*?previous=\{previous && link\(previous\)\}[\s\S]*?next=\{next && link\(next\)\}[\s\S]*?back=\{\{ href: home/, "the foot: previous, next, back to the story");
  assert.doesNotMatch(page, /ContinuePrompt|PageHero|bl-versus/, "the arcade head and « Continuer ? » are gone");
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(readFileSync(join(root, `messages/${l}.json`), "utf8")).chapter;
    assert.equal(m.round, "Round {n}");
    for (const k of ["previous", "nextLabel", "nav", "toStory", "faced", "built"]) assert.ok(m[k]?.trim(), `${l}: chapter.${k}`);
    for (const k of ["continue", "start", "nextCaption", "storySoFar", "vs", "versus"]) assert.equal(m[k], undefined, `${l}: chapter.${k} is gone`);
  }
});

test("the foot's previous and next are the neighbours in reading order, in the chapter's own language", () => {
  const lib = readFileSync(join(root, "lib/chapters.ts"), "utf8");
  assert.match(lib, /previousChapter = \(c: Chapter\)[^\n]*chaptersOf\(c\.locale\)\.filter\(\(x\) => x\.chapter < c\.chapter\)\.at\(-1\)/);
  assert.match(lib, /nextChapter = \(c: Chapter\)[^\n]*chaptersOf\(c\.locale\)\.find\(\(x\) => x\.chapter > c\.chapter\)/);
});

test("chapters never trigger the newsletter (its workflow watches content/posts only)", () => {
  assert.doesNotMatch(readFileSync(join(root, ".github/workflows/newsletter.yml"), "utf8"), /content\/chapters/);
});

test("a chapter's search title and description fit check-meta (seoTitle or title + site name; seoDescription or lead)", () => {
  for (const f of readdirSync(CHAPTERS).filter((f) => f.endsWith(".mdx"))) {
    const locale = f.match(/\.(en|fr)\.mdx$/)[1];
    const { data } = read(f);
    const siteName = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8")).site.name;
    const title = data.seoTitle?.trim() || `${data.title} — ${siteName}`;
    const description = data.seoDescription?.trim() || data.description;
    assert.ok([...title].length <= 60, `${f}: title is ${[...title].length} characters`);
    assert.ok([...description].length <= 155, `${f}: description is ${[...description].length} characters`);
  }
});

test("a chapter links to the krizaka.com home of its own language (/en in English, /fr in French)", () => {
  for (const f of readdirSync(CHAPTERS).filter((f) => f.endsWith(".mdx"))) {
    const locale = f.match(/\.(en|fr)\.mdx$/)[1];
    const wrong = locale === "en" ? /www\.krizaka\.com\/fr\b/ : /www\.krizaka\.com\/en\b/;
    assert.doesNotMatch(read(f).content, wrong, `${f} links to the other language's home`);
  }
});

test("chapter 3 tells the GPU left on once, with the figure of the post it came from: no pod of five billed hours", () => {
  for (const f of ["what-a-gpu-costs.en.mdx", "what-a-gpu-costs.fr.mdx"]) {
    assert.doesNotMatch(read(f).content, /five billed hours|cinq heures facturées/, f);
  }
});
