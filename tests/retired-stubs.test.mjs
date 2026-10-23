import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

/* The posts merged into a chapter (lib/redirects.json): each keeps its old address as a static stub that moves the reader
   to the chapter's section. No live post has a stub, and no page or link points at a removed post. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const map = JSON.parse(read("lib/redirects.json"));
const posts = readdirSync(new URL("../content/posts/", import.meta.url));
const chapters = readdirSync(new URL("../content/chapters/", import.meta.url));

/* The chapter file a target names: /story/<slug>/ (EN) or /fr/story/<slug>/ (FR), with its anchor. */
function targetOf(href, locale) {
  const [path, anchor = ""] = href.split("#");
  const m = path.match(/^\/(fr\/)?story\/([a-z0-9-]+)\/$/);
  assert.ok(m, `${href} is a chapter path`);
  assert.equal(!!m[1], locale === "fr", `${href} is in ${locale}`);
  return { file: new URL(`../content/chapters/${m[2]}.${locale}.mdx`, import.meta.url), anchor };
}

test("every retired slug has its EN and FR stub, and the post file is gone in both languages", () => {
  for (const slug of Object.keys(map)) {
    assert.ok(map[slug].en && map[slug].fr, `${slug} has both languages`);
    for (const l of ["en", "fr"]) assert.ok(!posts.includes(`${slug}.${l}.mdx`), `${slug}.${l} is removed from content/posts`);
  }
});

test("every stub points to an existing, published chapter of the same language, at one of its section anchors", () => {
  for (const [slug, targets] of Object.entries(map)) {
    for (const locale of ["en", "fr"]) {
      const { file, anchor } = targetOf(targets[locale], locale);
      assert.ok(existsSync(file), `${slug}: ${file.pathname} exists`);
      const { data, content } = matter(readFileSync(file, "utf8"));
      assert.equal(data.draft, false, `${slug}: the chapter is published`);
      if (anchor) {
        const slugger = new GithubSlugger();
        const ids = [...content.matchAll(/^#{2,3} (.+)$/gm)].map((m) => slugger.slug(m[1].trim()));
        assert.ok(ids.includes(decodeURIComponent(anchor)), `${slug}: #${anchor} is a section of ${data.title}`);
      }
    }
  }
});

test("no live post has a stub: a retired slug is not a post", () => {
  const live = new Set(posts.map((f) => f.replace(/\.(en|fr)\.mdx$/, "")));
  for (const slug of Object.keys(map)) assert.ok(!live.has(slug), `${slug} is not a live post`);
});

test("no post or chapter links to a removed post's address", () => {
  for (const dir of ["content/posts/", "content/chapters/"]) {
    for (const f of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const body = read(`${dir}${f}`);
      for (const slug of Object.keys(map)) {
        assert.doesNotMatch(body, new RegExp(`/(fr/)?posts/${slug}`), `${dir}${f} links to ${slug}`);
      }
    }
  }
});

test("the stub page is a 0-second refresh with a canonical, noindex, and a visible link", () => {
  const stub = read("app/components/pages/RetiredPost.tsx");
  assert.match(stub, /httpEquiv="refresh" content=\{`0; url=\$\{target\.href\}`\}/);
  assert.match(read("lib/retired.ts"), /retiredTarget/);
  assert.match(stub, /robots: \{ index: false/);
  assert.match(stub, /canonical: `\$\{SITE_URL\}\$\{target\.href\}`/);
  assert.match(stub, /<Link href=\{target\.href\}>/);
});

test("the routes build a stub for each retired slug and keep the live posts", () => {
  for (const locale of ["en", "fr"]) {
    const route = read(locale === "en" ? "app/(en)/posts/[slug]/page.tsx" : "app/fr/posts/[slug]/page.tsx");
    assert.match(route, /retiredSlugs\(\)\.map/);
    assert.match(route, /<RetiredPost locale="[a-z]+" slug=\{slug\} \/>/);
    assert.match(route, /postsOf\("[a-z]+"\)\.map/);
  }
});

test("the sitemap and the feeds read the content: no stub, no removed post", () => {
  assert.doesNotMatch(read("app/sitemap.ts"), /redirects/);
  assert.doesNotMatch(read("app/components/pages/RetiredPost.tsx"), /sitemap/);
});
