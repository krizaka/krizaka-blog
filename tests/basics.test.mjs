import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { internalLinkProblems } from "../scripts/content-rules.mjs";

/* « Les bases » (the shelf of five posts) lives at /basics/<slug>/ (EN) and /fr/basics/<slug>/ (FR), with an index at /basics/
   and /fr/basics/. The series are retired: each series address is a stub to the story or to the shelf (lib/redirects.json). */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const map = JSON.parse(read("lib/redirects.json"));
const SHELF = [
  "understanding-ai-before-you-start",
  "ai-model-families-and-why-you-need-a-gpu",
  "anatomy-of-an-ai-prompt",
  "is-that-ai-model-really-open-source",
  "payments-and-high-risk-industries",
];

test("the shelf's five posts are in content/posts in both languages, without a series", () => {
  for (const slug of SHELF) {
    for (const l of ["en", "fr"]) {
      const file = new URL(`../content/posts/${slug}.${l}.mdx`, import.meta.url);
      assert.ok(existsSync(file), `${slug}.${l} is a live post`);
      const { data } = matter(readFileSync(file, "utf8"));
      assert.equal(data.series, undefined, `${slug}.${l} has no series`);
      assert.equal(data.part, undefined, `${slug}.${l} has no part`);
      assert.equal(data.draft, false, `${slug}.${l} is published`);
    }
  }
});

test("the shelf's posts are served at /basics/<slug>/ and /fr/basics/<slug>/, and the index at /basics/", () => {
  assert.match(read("lib/seo.ts"), /export const postPath = \(slug: string\) => `\/basics\/\$\{slug\}`;/);
  assert.ok(existsSync(new URL("../app/(en)/basics/[slug]/page.tsx", import.meta.url)), "EN post route");
  assert.ok(existsSync(new URL("../app/fr/basics/[slug]/page.tsx", import.meta.url)), "FR post route");
  assert.ok(existsSync(new URL("../app/(en)/basics/page.tsx", import.meta.url)), "EN index");
  assert.ok(existsSync(new URL("../app/fr/basics/page.tsx", import.meta.url)), "FR index");
  for (const l of ["en", "fr"]) {
    const route = read(l === "en" ? "app/(en)/basics/[slug]/page.tsx" : "app/fr/basics/[slug]/page.tsx");
    assert.match(route, /postsOf\("[a-z]+"\)\.map/, `${l} route generates the live posts`);
  }
});

test("the old posts routes only answer the stubs of retired posts (no live post under /posts/)", () => {
  for (const l of ["en", "fr"]) {
    const route = read(l === "en" ? "app/(en)/posts/[slug]/page.tsx" : "app/fr/posts/[slug]/page.tsx");
    assert.match(route, /retiredSlugs\(\)\.map/, `${l} posts route builds the stubs`);
    assert.doesNotMatch(route, /postsOf\(/, `${l} posts route has no live post`);
  }
});

test("every retired series has a stub under /series/<id>/ that leads to the story or to the shelf", () => {
  const series = Object.keys(map).filter((k) => k.startsWith("series:"));
  assert.ok(series.length >= 4, "the four series are mapped");
  for (const key of series) {
    const id = key.slice("series:".length);
    const target = map[key];
    assert.ok(target.en.startsWith("/story/") || target.en.startsWith("/basics/"), `${id} leads to the story or the shelf`);
    assert.ok(target.fr.startsWith("/fr/story/") || target.fr.startsWith("/fr/basics/"), `${id} leads to the story or the shelf in FR`);
  }
  for (const l of ["en", "fr"]) {
    const route = read(l === "en" ? "app/(en)/series/[series]/page.tsx" : "app/fr/series/[series]/page.tsx");
    assert.match(route, /retiredSeriesIds\(\)/, `${l} series route builds the stubs`);
    assert.match(route, /<RetiredPost locale="[a-z]+" slug=\{`series:\$\{series\}`\} \/>/, `${l} series route renders the stub`);
  }
});

test("each shelf slug is redirected from its old /posts/ address to /basics/, and each absorbed slug to a chapter", () => {
  for (const slug of SHELF) {
    assert.equal(map[slug].en, `/basics/${slug}/`);
    assert.equal(map[slug].fr, `/fr/basics/${slug}/`);
  }
  for (const [slug, targets] of Object.entries(map)) {
    if (slug.startsWith("series:") || SHELF.includes(slug)) continue;
    assert.match(targets.en, /^\/story\//, `${slug} goes to a chapter`);
    assert.match(targets.fr, /^\/fr\/story\//, `${slug} goes to a chapter in FR`);
  }
});

test("the internal link check reads /basics/ links like post links: a live shelf post passes, an unknown one fails", () => {
  const known = new Map([["posts:en:understanding-ai-before-you-start", false]]);
  assert.deepEqual(internalLinkProblems("x.en.mdx", "[a](/basics/understanding-ai-before-you-start/)", known), []);
  assert.equal(internalLinkProblems("x.en.mdx", "[a](/basics/nope/)", known).length, 1);
});

test("the sitemap lists the shelf index and no series page", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /"\/basics"/);
  assert.doesNotMatch(sitemap, /\/series\//);
});

test("the CI smoke checks read the shelf at /basics/ (a live post)", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /out\/basics\/understanding-ai-before-you-start\/index\.html/);
  assert.doesNotMatch(ci, /out\/posts\/understanding-ai-before-you-start/);
});

test("the posts' newsletter address and the engage link use /basics/", () => {
  assert.match(read("scripts/newsletter-send.mjs"), /\/basics\/\$\{slug\}\//);
  assert.doesNotMatch(read("scripts/newsletter-send.mjs"), /\/posts\/\$\{slug\}\//);
  assert.doesNotMatch(read("app/components/engage/PostEngage.tsx"), /\/posts\//);
  assert.doesNotMatch(read("scripts/postbuild.mjs"), /\/posts\/\$\{p\.slug\}/);
});
