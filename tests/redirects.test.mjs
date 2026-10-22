import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { isRedirectStub, metaProblems } from "../scripts/check-meta.mjs";
import { redirectPages } from "../scripts/post-redirects.mjs";

/* A post merged into another keeps its address: the build writes a page at the old one (content/redirects.json). The ingress of
   .do/app.yaml lists no route one by one (DigitalOcean has no regex). Every source is a post that no longer exists, every target a
   published post of the same language. */
const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
const map = JSON.parse(readFileSync(new URL("../content/redirects.json", import.meta.url), "utf8"));
const post = (slug, lang) => new URL(`../content/posts/${slug}.${lang}.mdx`, import.meta.url);

test("the merged posts point to the post that absorbed them, in both languages", () => {
  const pages = redirectPages(map);
  assert.equal(pages.length, 4);
  assert.ok(pages.some((p) => p.path === "fr/posts/measured-not-promised/index.html" && p.target === "https://blog.krizaka.com/fr/posts/what-image-and-video-generation-costs/"));
  for (const [from, to] of Object.entries(map)) {
    for (const lang of ["en", "fr"]) {
      assert.ok(!existsSync(post(from, lang)), `${from} (${lang}) is gone`);
      assert.ok(existsSync(post(to, lang)), `${to} (${lang}) exists`);
      assert.equal(matter(readFileSync(post(to, lang), "utf8")).data.draft, false, `${to} is published`);
    }
  }
  for (const p of pages) assert.match(p.html, /http-equiv="refresh" content="0; url=https:\/\/blog\.krizaka\.com\/(fr\/)?posts\/[a-z0-9-]+\/"/);
});

test("the ingress lists no post route: the sign-in under /api, the site for the rest", () => {
  assert.doesNotMatch(spec, /\/posts\//);
  assert.match(spec, /prefix: \/api \} \}\n\s+component: \{ name: oauth \}/);
  assert.match(spec, /prefix: \/ \} \}\n\s+component: \{ name: site \}/);
  assert.doesNotMatch(spec, /routes:/);
});

test("the site is open to search engines now that posts are published", () => {
  assert.match(spec, /key: APP_INDEXING_ENABLED\n\s+scope: BUILD_TIME\n\s+value: "true"/);
});

test("the SEO audit leaves the redirect pages alone, and still audits a real page", () => {
  for (const p of redirectPages(map)) assert.ok(isRedirectStub(p.html), p.path);
  assert.ok(!isRedirectStub("<html><head><title>A post</title></head><body><h1>A post</h1></body></html>"));
  assert.ok(metaProblems("<html><head><title>x</title></head><body></body></html>").length > 0);
});
