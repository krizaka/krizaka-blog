import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

/* The old addresses (lib/redirects.json): each keeps a static stub that moves the reader to its new place.
   - an absorbed post is removed; its stub goes to a chapter's section;
   - a shelf post (« Les bases ») stays live at /basics/<slug>/; its old /posts/ address goes there;
   - a series (`series:<id>`) is retired; its address goes to the story (the home) or the shelf;
   - a removed page (`page:<path>`, krizaka-blog#123: the blog is one page) goes to the story, or to the chapter or shelf post that
     absorbed it: /story/, /series/, /tags/ and every topic, /search/, /saved/, /feed/, /posts/.
   No page or link points at a removed address. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const map = JSON.parse(read("lib/redirects.json"));
const posts = readdirSync(new URL("../content/posts/", import.meta.url));
/* The stub of a removed page reads like the others (RetiredPost); its words say the page is gone, not that a post moved. */
const chapters = readdirSync(new URL("../content/chapters/", import.meta.url));
const slugs = Object.keys(map).filter((k) => !k.startsWith("series:") && !k.startsWith("page:"));
const pages = Object.keys(map).filter((k) => k.startsWith("page:"));
const read2 = (l, rel) => read(`${l === "en" ? "app/(en)" : "app/fr"}/${rel}`);

/* The file a target names: a chapter (/story/<slug>/, /fr/story/<slug>/) or a shelf post (/basics/<slug>/, /fr/basics/<slug>/). */
function targetOf(href, locale) {
  const [path, anchor = ""] = href.split("#");
  const chapter = path.match(/^\/(fr\/)?story\/([a-z0-9-]+)\/$/);
  const shelf = path.match(/^\/(fr\/)?basics\/([a-z0-9-]+)\/$/);
  const m = chapter ?? shelf;
  assert.ok(m, `${href} is a chapter or a shelf path`);
  assert.equal(!!m[1], locale === "fr", `${href} is in ${locale}`);
  const dir = chapter ? "chapters" : "posts";
  return { file: new URL(`../content/${dir}/${m[2]}.${locale}.mdx`, import.meta.url), anchor, kind: chapter ? "chapter" : "shelf" };
}

test("every retired slug has its EN and FR stub; an absorbed post's file is gone, a shelf post's stays live", () => {
  for (const slug of slugs) {
    assert.ok(map[slug].en && map[slug].fr, `${slug} has both languages`);
    for (const l of ["en", "fr"]) {
      const stays = map[slug][l].includes("/basics/");
      assert.equal(posts.includes(`${slug}.${l}.mdx`), stays, `${slug}.${l}: ${stays ? "still a live post" : "removed from content/posts"}`);
    }
  }
});

test("every stub points to an existing, published chapter or shelf post of the same language, at a section anchor for a chapter", () => {
  for (const slug of slugs) {
    for (const locale of ["en", "fr"]) {
      const { file, anchor, kind } = targetOf(map[slug][locale], locale);
      assert.ok(existsSync(file), `${slug}: ${file.pathname} exists`);
      const { data, content } = matter(readFileSync(file, "utf8"));
      assert.equal(data.draft, false, `${slug}: the target is published`);
      if (kind === "chapter" && anchor) {
        const slugger = new GithubSlugger();
        const ids = [...content.matchAll(/^#{2,3} (.+)$/gm)].map((m) => slugger.slug(m[1].trim()));
        assert.ok(ids.includes(decodeURIComponent(anchor)), `${slug}: #${anchor} is a section of ${data.title}`);
      }
    }
  }
});

test("a stub's address is not a live post under /posts/: the shelf is served at /basics/ only", () => {
  for (const slug of slugs) for (const l of ["en", "fr"]) assert.doesNotMatch(map[slug][l], /\/posts\//, `${slug}: the target is not /posts/`);
});

test("no post or chapter links to a removed address under /posts/ or /series/", () => {
  for (const dir of ["content/posts/", "content/chapters/"]) {
    for (const f of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const body = read(`${dir}${f}`);
      for (const slug of slugs) {
        assert.doesNotMatch(body, new RegExp(`/(fr/)?posts/${slug}`), `${dir}${f} links to ${slug}`);
      }
      assert.doesNotMatch(body, /\/(fr\/)?series\//, `${dir}${f} links to a series`);
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

test("the posts routes build a stub for each retired slug (no live post); the shelf route builds the live posts", () => {
  for (const locale of ["en", "fr"]) {
    const route = read(locale === "en" ? "app/(en)/posts/[slug]/page.tsx" : "app/fr/posts/[slug]/page.tsx");
    assert.match(route, /retiredSlugs\(\)\.map/);
    assert.match(route, /<RetiredPost locale="[a-z]+" slug=\{slug\} \/>/);
    assert.doesNotMatch(route, /postsOf\(/);
  }
});

test("the sitemap reads the content: no stub, no removed post, no removed page", () => {
  assert.doesNotMatch(read("app/sitemap.ts"), /redirects/);
  assert.doesNotMatch(read("app/sitemap.ts"), /"\/(tags|series|search|saved|feed|story)"/);
  assert.doesNotMatch(read("app/components/pages/RetiredPost.tsx"), /sitemap/);
});

test("the feeds carry the published chapters (/story/ URLs) next to the posts, in both formats and both languages", () => {
  assert.match(read("lib/feeds.ts"), /export const feedEntriesOf/);
  assert.match(read("lib/feeds.ts"), /chaptersOf\(locale\)[\s\S]*chapterPath\(/);
  for (const route of ["app/(en)/feed.xml/route.ts", "app/(en)/atom.xml/route.ts", "app/fr/feed.xml/route.ts", "app/fr/atom.xml/route.ts"]) {
    assert.match(read(route), /feedEntriesOf\(/, route);
    assert.doesNotMatch(read(route), /postsOf\(/, route);
  }
});

test("the CI smoke checks read a live post; the retired address is only checked as a stub (its refresh)", () => {
  const lines = read("scripts/ci-after-build.sh").split("\n").filter((l) => l.includes("what-image-and-video-generation-costs"));
  for (const l of lines) assert.match(l, /http-equiv="refresh"|refresh/, `a CI line still reads the retired post as a live one: ${l.trim()}`);
  assert.match(read("scripts/ci-after-build.sh"), /out\/basics\/understanding-ai-before-you-start\/index\.html/);
});

/* krizaka-blog#123: each removed page answers a permanent move (a stub: 0-second refresh + canonical, noindex — what a static host
   gives as a 308) to the story, or to the chapter / shelf post that absorbed it. */
const REMOVED = ["/story/", "/series/", "/tags/", "/search/", "/saved/", "/feed/", "/posts/"];

test("every removed page has its key, in both languages, to the story or to what absorbed it", () => {
  for (const path of REMOVED) assert.ok(map[`page:${path}`], `${path} is mapped`);
  for (const key of pages) {
    for (const l of ["en", "fr"]) {
      const href = map[key][l];
      const home = l === "en" ? "/" : "/fr/";
      const ok = href === home || new RegExp(`^${l === "fr" ? "/fr" : ""}/(story|basics)/[a-z0-9-]+/$`).test(href) || href === `${home}basics/`;
      assert.ok(ok, `${key} (${l}) → ${href}: the story, a chapter or the shelf`);
      if (href.includes("/story/") || /\/basics\/[a-z0-9-]+\//.test(href)) {
        const [, kind, slug] = href.match(/\/(story|basics)\/([a-z0-9-]+)\//);
        assert.ok(kind === "story" ? chapters.includes(`${slug}.${l}.mdx`) : posts.includes(`${slug}.${l}.mdx`), `${key} (${l}): ${slug} exists`);
      }
    }
  }
});

test("every topic the posts ever had keeps its address as a stub", () => {
  const tags = Object.keys(JSON.parse(read("messages/en.json")).tags.names);
  for (const tag of tags) assert.ok(map[`page:/tags/${tag}/`], `/tags/${tag}/ is mapped`);
});

test("each removed page's route renders the stub (no page of its own), in both languages", () => {
  for (const l of ["en", "fr"]) {
    for (const path of REMOVED) {
      const route = read2(l, `${path.slice(1, -1)}/page.tsx`);
      assert.ok(route.includes(`pageKey("${path}")`), `${l} ${path}`);
      assert.match(route, new RegExp(`<RetiredPost locale="${l}" slug=\\{key\\} />`), `${l} ${path} renders the stub`);
      assert.match(route, new RegExp(`retiredMetadata\\("${l}"`), `${l} ${path}: noindex and the canonical of the target`);
    }
    const tag = read2(l, "tags/[tag]/page.tsx");
    assert.match(tag, /retiredPagesUnder\("\/tags\/"\)/);
    assert.match(tag, /<RetiredPost locale="[a-z]+" slug=\{key\} \/>/);
  }
});

test("the removed pages' components are gone: no search, saved, topics, series, feed page or old story page is rendered any more", () => {
  for (const f of ["SearchPage", "SavedPage", "TagsPage", "SeriesPage", "StoryPage", "TopicFilter"]) assert.ok(!existsSync(new URL(`../app/components/pages/${f}.tsx`, import.meta.url)), `${f} is gone`);
  assert.ok(!existsSync(new URL("../app/components/feed/FeedPage.tsx", import.meta.url)));
  assert.ok(!existsSync(new URL("../app/components/SearchBox.tsx", import.meta.url)));
});
