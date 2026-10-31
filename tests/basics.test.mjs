import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { internalLinkProblems } from "../scripts/content-rules.mjs";

/* « Les bases » (the shelf of four posts) lives at /basics/<slug>/ (EN) and /fr/basics/<slug>/ (FR), with an index at /basics/
   and /fr/basics/. The series are retired: each series address is a stub to the story or to the shelf (lib/redirects.json). */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };
const map = JSON.parse(read("lib/redirects.json"));
const SHELF = [
  "understanding-ai-before-you-start",
  "ai-model-families-and-why-you-need-a-gpu",
  "anatomy-of-an-ai-prompt",
  "is-that-ai-model-really-open-source",
];

test("the shelf's four posts are in content/posts in both languages, without a series", () => {
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
    assert.match(route, new RegExp(`basicsRoute\\("${l}"\\)`), `${l} route binds its language to the shared route`);
  }
  assert.match(
    read("app/components/pages/BasicsRoute.tsx"),
    /postsOf\(locale\)\.map/,
    "the shared route generates the live posts",
  );
  {
  }
});

test("the old posts routes only answer the stubs of retired posts (no live post under /posts/)", () => {
  for (const l of ["en", "fr"]) {
    const route = read(l === "en" ? "app/(en)/posts/[slug]/page.tsx" : "app/fr/posts/[slug]/page.tsx");
    assert.match(route, /retiredSlugs\(\)\.map/, `${l} posts route builds the stubs`);
    assert.doesNotMatch(route, /postsOf\(/, `${l} posts route has no live post`);
  }
});

test("every retired series has a stub under /series/<id>/ that leads to the story (the home) or to the shelf", () => {
  const series = Object.keys(map).filter((k) => k.startsWith("series:"));
  assert.ok(series.length >= 4, "the four series are mapped");
  for (const key of series) {
    const id = key.slice("series:".length);
    const target = map[key];
    assert.ok(target.en === "/" || target.en.startsWith("/basics/"), `${id} leads to the story or the shelf`);
    assert.ok(
      target.fr === "/fr/" || target.fr.startsWith("/fr/basics/"),
      `${id} leads to the story or the shelf in FR`,
    );
  }
  for (const l of ["en", "fr"]) {
    const route = read(l === "en" ? "app/(en)/series/[series]/page.tsx" : "app/fr/series/[series]/page.tsx");
    assert.match(route, /retiredSeriesIds\(\)/, `${l} series route builds the stubs`);
    assert.match(
      route,
      /<RetiredPost locale="[a-z]+" slug=\{`series:\$\{series\}`\} \/>/,
      `${l} series route renders the stub`,
    );
  }
});

test("each shelf slug is redirected from its old /posts/ address to /basics/, and each absorbed slug to a chapter", () => {
  for (const slug of SHELF) {
    assert.equal(map[slug].en, `/basics/${slug}/`);
    assert.equal(map[slug].fr, `/fr/basics/${slug}/`);
  }
  for (const [slug, targets] of Object.entries(map)) {
    if (slug.startsWith("series:") || slug.startsWith("page:") || SHELF.includes(slug)) continue;
    // A withdrawn post (krizaka/.github#413) goes to the shelf (/basics/).
    if (targets.en === "/basics/" && targets.fr === "/fr/basics/") continue;
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
  const ci = read("scripts/ci-after-build.sh");
  assert.match(ci, /out\/basics\/understanding-ai-before-you-start\/index\.html/);
  assert.doesNotMatch(ci, /out\/posts\/understanding-ai-before-you-start/);
});

test("the posts' newsletter address and the engage link use /basics/", () => {
  assert.match(read("scripts/newsletter-send.mjs"), /\["posts", "\/basics\/"\]/);
  assert.doesNotMatch(read("scripts/newsletter-send.mjs"), /\/posts\/\$\{slug\}\//);
  assert.doesNotMatch(read("app/components/engage/PostEngage.tsx"), /\/posts\//);
  assert.doesNotMatch(read("scripts/postbuild.mjs"), /\/posts\/\$\{p\.slug\}/);
});

/* The reading path (krizaka-blog#229): one ordered list, the easiest way in, shown as a numbered list on the home and /basics/. */
test("the reading path lists the shelf in order, starting with « Understanding AI before you start »", () => {
  const src = read("lib/basics.ts");
  const listed = [...src.matchAll(/^\s+"([a-z0-9-]+)",$/gm)].map((m) => m[1]);
  assert.deepEqual([...listed].sort(), [...SHELF].sort(), "every basic is on the path, once");
  assert.equal(listed[0], "understanding-ai-before-you-start");
});

test("home and /basics/ show the path as BasicsPath, with the intro; no nav entry in the bar", () => {
  assert.match(read("app/components/pages/HomePage.tsx"), /<BasicsPath /);
  assert.match(read("app/components/pages/BasicsPage.tsx"), /<BasicsPath /);
  assert.match(read("app/components/pages/BasicsPath.tsx"), /<ol className="bl-path"/);
  for (const l of ["en", "fr"]) {
    const b = messages[l].basics;
    assert.ok(b.for && b.startHere && b.step.includes("{n}") && b.step.includes("{total}"), `${l} words`);
  }
  assert.doesNotMatch(read("app/components/TopBar.tsx"), /basics/i);
});

test("a withdrawn basic keeps a stub at its address, to the shelf (krizaka/.github#413)", () => {
  const key = "page:/basics/payments-and-high-risk-industries/";
  assert.deepEqual(map[key], { en: "/basics/", fr: "/fr/basics/" });
  for (const l of ["en", "fr"])
    assert.ok(!existsSync(new URL(`../content/posts/payments-and-high-risk-industries.${l}.mdx`, import.meta.url)), l);
  assert.match(read("app/components/pages/BasicsRoute.tsx"), /retiredPagesUnder\("\/basics\/"\)/);
});

test("the path is a compact list: one link a row, read marks stay on the device, « Start here » and « Next » in both languages", () => {
  const path = read("app/components/pages/BasicsPath.tsx");
  assert.match(path, /<StepState /);
  assert.match(path, /bl-path-link/);
  assert.doesNotMatch(path, /PostCard/, "no big card in the path");
  const store = read("lib/read-store.ts");
  assert.match(store, /localStorage/);
  assert.doesNotMatch(store, /fetch\(/, "the read marks are never sent anywhere");
  assert.match(read("app/components/pages/PostPage.tsx"), /<MarkRead slug=\{post\.slug\} \/>/);
  for (const l of ["en", "fr"]) {
    const b = messages[l].basics;
    assert.ok(b.startHere && b.next && b.read, `${l} labels`);
  }
});

test("the path wears the series' art: a basic's cover is one of the chapters' covers, not a photo", () => {
  const onPath = [...read("lib/basics.ts").matchAll(/^\s+"([a-z0-9-]+)",$/gm)].map((m) => m[1]);
  assert.ok(onPath.length >= 4, "the path lists its reads");
  for (const slug of onPath)
    for (const l of ["en", "fr"])
      assert.match(read(`content/posts/${slug}.${l}.mdx`), /^cover: series-\d\d-/m, `${slug}.${l}`);
});
