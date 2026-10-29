import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* /feed.xml is pure RSS, for readers: no XSLT (Chrome is removing it). RSS and Atom stay as files, not as pages (krizaka-blog#123):
   the human page /feed/ is gone — its address is a stub to the story — and every « RSS » link of the site names the file itself. The
   e-mail form is the main way to follow (the home's newsletter line, the end of every post). */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the feeds carry no XSLT stylesheet and the stylesheet is gone", () => {
  const feeds = read("lib/feeds.ts");
  assert.doesNotMatch(feeds, /xml-stylesheet|feed\.xsl/);
  assert.match(feeds, /<\?xml version="1\.0" encoding="UTF-8"\?>\\n<rss version="2\.0"/);
  assert.equal(existsSync(new URL("../lib/feed-xsl.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/(en)/feed.xsl", import.meta.url)), false);
  assert.doesNotMatch(read("scripts/ci-after-build.sh"), /xsltproc|grep -q '<\?xml-stylesheet/);
});

test("/feed.xml stays the raw feed in both languages", () => {
  assert.match(read("app/(en)/feed.xml/route.ts"), /application\/rss\+xml/);
  assert.match(read("app/fr/feed.xml/route.ts"), /application\/rss\+xml/);
  assert.match(
    read("lib/seo.ts"),
    /"application\/rss\+xml": `\$\{SITE_URL\}\$\{locale === "en" \? "" : "\/fr"\}\/feed\.xml`/,
  );
});

test("the feed page is gone: /feed/ is a stub to the story in both languages, and nothing renders it", () => {
  for (const [f, l] of [
    ["app/(en)/feed/page.tsx", "en"],
    ["app/fr/feed/page.tsx", "fr"],
  ]) {
    assert.match(read(f), /pageKey\("\/feed\/"\)/, f);
    assert.match(read(f), new RegExp(`<RetiredPost locale="${l}"`), f);
  }
  assert.equal(existsSync(new URL("../app/components/feed/FeedPage.tsx", import.meta.url)), false);
  assert.doesNotMatch(read("app/sitemap.ts"), /"\/feed"/);
  for (const l of ["en", "fr"])
    assert.equal(JSON.parse(read(`messages/${l}.json`)).feedPage, undefined, `${l}: no feedPage words left`);
});

test("every human-facing RSS link names the file (/feed.xml), never the removed /feed/ page", () => {
  const post = read("app/components/pages/PostPage.tsx");
  const footer = read("app/components/SiteFooter.tsx");
  for (const [name, src] of [
    ["PostPage", post],
    ["SiteFooter", footer],
  ]) {
    assert.match(src, /\/feed\.xml`/, `${name} links /feed.xml`);
    assert.doesNotMatch(src, /\/feed\/`|localizedPath\(locale, "\/feed"\)/, `${name} does not link /feed/`);
  }
  assert.doesNotMatch(read("app/components/TopBar.tsx"), /\/feed/, "the bar carries no feed");
  assert.match(footer, /\/atom\.xml/, "the Atom file stays a file, for readers");
});

test("on a post, « Subscribe » goes to the e-mail form and the feed is a secondary link", () => {
  const page = read("app/components/pages/PostPage.tsx");
  const form = read("app/components/newsletter/NewsletterSection.tsx");
  assert.match(page, /variant="primary"[^]*?href="#subscribe"/);
  assert.match(page, /variant="ghost"[^]*?\/feed\.xml`/);
  assert.match(form, /id="subscribe"/);
  assert.match(page, /<NewsletterSection locale=\{locale\} where="post" \/>/);
});

/* The feeds list the chapters of the story and the posts that remain, each at its own address (lib/feeds.ts feedEntriesOf).
   A retired post is not a post any more, so it is in neither. */
test("the four feed routes read feedEntriesOf: the chapters and the remaining posts, at their own addresses", () => {
  const routes = {
    "app/(en)/feed.xml/route.ts": /rss\("en", feedEntriesOf\("en"\)\)/,
    "app/(en)/atom.xml/route.ts": /atom\("en", feedEntriesOf\("en"\)\)/,
    "app/fr/feed.xml/route.ts": /rss\("fr", feedEntriesOf\("fr"\)\)/,
    "app/fr/atom.xml/route.ts": /atom\("fr", feedEntriesOf\("fr"\)\)/,
  };
  for (const [f, re] of Object.entries(routes)) assert.match(read(f), re, f);
  const feeds = read("lib/feeds.ts");
  assert.match(feeds, /\.\.\.chaptersOf\(locale\)\.map\(\(item\) => \(\{ item, path: chapterPath\(item\.slug\) \}\)\)/);
  assert.match(feeds, /\.\.\.postsOf\(locale\)\.map\(\(item\) => \(\{ item, path: postPath\(item\.slug\) \}\)\)/);
  assert.equal(
    (feeds.match(/absoluteUrl\(locale, path\)/g) ?? []).length,
    2,
    "the RSS item and the Atom entry link to the entry's own path",
  );
});
