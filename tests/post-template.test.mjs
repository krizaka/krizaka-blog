// The post template's end and top (krizaka-internal#3643, founder 2026-11-15): the founder's signature ends every post he wrote, like
// a chapter, and the other language is a discreet text link, not a button. The page contract runs on the built site too
// (scripts/check-post-pages.mjs, scripts/ci-after-build.sh).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { bookProblems, postPageProblems } from "../scripts/check-post-pages.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const page = read("app/components/pages/PostPage.tsx");
const byline = read("app/components/pages/Byline.tsx");
const css = read("app/globals.css");

test("a post page ends with the signature of a founder's post, after the article and before the newsletter, in a Section like a chapter's", () => {
  assert.equal((page.match(/<Signature\b/g) ?? []).length, 1);
  assert.match(page, /\{signs\(post\.author\) && \(\s*<Section[^>]*>\s*<Signature locale=\{locale\} \/>/);
  assert.ok(page.indexOf("<Signature") > page.indexOf("bl-post-body"));
  assert.ok(page.indexOf("<Signature") < page.indexOf("<NewsletterSection"));
});

test("the other language is a discreet text link (globe, muted, underline on hover, focus ring), not a Button", () => {
  assert.doesNotMatch(byline, /<Button\b/);
  assert.match(byline, /className="bl-byline-other"/);
  assert.match(byline, /hrefLang=\{otherLang\}/);
  assert.match(byline, /lang=\{otherLang\}/);
  assert.match(byline, /<GlobeIcon/);
  assert.match(css, /\.bl-byline-other \{[^}]*color: var\(--kz-text-secondary\)/);
  assert.match(css, /\.bl-byline-other:hover \{[^}]*text-decoration: underline/);
  assert.match(css, /\.bl-byline-other:focus-visible \{[^}]*outline/);
});

const sign = '<aside class="bl-sign"></aside>';
const post = (inner, after = sign) =>
  `<div class="bl-byline-actions">${inner}</div><article class="bl-article"></article>${after}`;
const link = '<a class="bl-byline-other" href="/fr/basics/x/" hreflang="fr" lang="fr">Lire en français</a>';

test("the page contract passes a founder's post with the signature and the link", () => {
  assert.deepEqual(postPageProblems(post(link), { signs: true, hasOther: true }), []);
});

test("the page contract refuses a missing signature, a button for the other language, a signature before the article", () => {
  assert.match(postPageProblems(post(link, ""), { signs: true, hasOther: true }).join(), /signature block shows 0/);
  const button = '<a class="kz-button bl-byline-other" href="/fr/x/" hreflang="fr">Lire</a>';
  assert.match(postPageProblems(post(button), { signs: true, hasOther: true }).join(), /button/);
  const before = `${sign}<div class="bl-byline-actions">${link}</div><article class="bl-article"></article>`;
  assert.match(postPageProblems(before, { signs: true, hasOther: true }).join(), /not after the article/);
  assert.match(postPageProblems(post(link), { signs: false, hasOther: true }).join(), /does not sign/);
});

test("the visual baselines cover the top and the end of two posts, light and dark, at 390 and 1440, and each one exists", async () => {
  const { shots, nameOf, visualProblem, TOLERANCE } = await import("../scripts/check-visual.mjs");
  const all = shots();
  assert.equal(all.length, 2 * 2 * 2 * 2);
  for (const part of ["top", "end"])
    for (const theme of ["light", "dark"])
      for (const width of [390, 1440])
        assert.ok(all.some((s) => s.part === part && s.theme === theme && s.width === width));
  for (const s of all)
    assert.ok(
      existsSync(new URL(`visual/${nameOf(s.slug, s.part, s.theme, s.width)}`, import.meta.url)),
      nameOf(s.slug, s.part, s.theme, s.width),
    );
  assert.equal(visualProblem("x", 0.001, true), null);
  assert.match(visualProblem("x", TOLERANCE * 2, true), /pixels differ/);
  assert.match(visualProblem("x", 0, false), /another size/);
  assert.match(read("scripts/ci-after-build.sh"), /check-visual\.mjs/);
  assert.match(read("scripts/ci-after-build.sh"), /check-post-pages\.mjs/);
});

test("the book contract: one navigation links a chapter and the story index, in each language", () => {
  const nav = (en, fr) => `<nav><a href="${en}">a</a><a href="${fr}">b</a></nav>`;
  assert.deepEqual(bookProblems(nav("/story/x/", "/"), { locale: "en" }), []);
  assert.deepEqual(bookProblems(nav("/fr/story/x/", "/fr/"), { locale: "fr" }), []);
  assert.match(bookProblems("<p>Related</p>", { locale: "en" }).join(), /no chapter.*no story index/);
  assert.match(bookProblems(nav("/", "/"), { locale: "en" }).join(), /no chapter/);
  assert.match(bookProblems(nav("/story/x/", "/story/y/"), { locale: "en" }).join(), /no story index/);
  assert.match(bookProblems(nav("/story/x/", "/fr/"), { locale: "fr" }).join(), /no chapter/);
  assert.match(
    bookProblems(`<nav><a href="/story/x/">a</a></nav><nav><a href="/">b</a></nav>`, { locale: "en" }).join(),
    /one navigation/,
  );
});

test("a post page ends with the book's foot, before the related posts", () => {
  assert.equal((page.match(/<BookNav\b/g) ?? []).length, 1);
  assert.ok(page.indexOf("<BookNav") < page.indexOf("t.post.related"));
  assert.ok(page.indexOf("<BookNav") > page.indexOf("<NewsletterSection"));
});

test("chaptersAround: the chapter just before and the one just after a post, by when they went out", async () => {
  const { chaptersAround } = await import("../lib/book.ts");
  const c = (chapter, publishedAt) => ({ chapter, publishedAt, date: publishedAt.slice(0, 10) });
  const chapters = [c(1, "2026-10-01T10:00:00Z"), c(2, "2026-10-10T10:00:00Z"), c(3, "2026-10-20T10:00:00Z")];
  const mid = chaptersAround({ publishedAt: "2026-10-15T09:00:00Z" }, chapters);
  assert.equal(mid.before?.chapter, 2);
  assert.equal(mid.after?.chapter, 3);
  const last = chaptersAround({ publishedAt: "2026-11-01T09:00:00Z" }, chapters);
  assert.equal(last.before?.chapter, 3);
  assert.equal(last.after, undefined);
  assert.equal(chaptersAround({ publishedAt: "2026-09-01T09:00:00Z" }, chapters).before, undefined);
});
