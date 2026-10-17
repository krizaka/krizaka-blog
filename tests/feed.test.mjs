import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* /feed.xml is pure RSS, for readers: no XSLT (Chrome is removing it). The human page about feeds is /feed/ (EN and FR): what RSS is,
   the address with a copy button, the latest posts, and the e-mail form as the main option. Every human-facing « RSS » link goes there. */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the feeds carry no XSLT stylesheet and the stylesheet is gone", () => {
  const feeds = read("lib/feeds.ts");
  assert.doesNotMatch(feeds, /xml-stylesheet|feed\.xsl/);
  assert.match(feeds, /<\?xml version="1\.0" encoding="UTF-8"\?>\\n<rss version="2\.0"/);
  assert.equal(existsSync(new URL("../lib/feed-xsl.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/(en)/feed.xsl", import.meta.url)), false);
  assert.doesNotMatch(read(".github/workflows/ci.yml"), /xsltproc|grep -q '<\?xml-stylesheet/);
});

test("/feed.xml stays the raw feed in both languages", () => {
  assert.match(read("app/(en)/feed.xml/route.ts"), /application\/rss\+xml/);
  assert.match(read("app/fr/feed.xml/route.ts"), /application\/rss\+xml/);
  assert.match(read("lib/seo.ts"), /"application\/rss\+xml": `\$\{SITE_URL\}\$\{locale === "en" \? "" : "\/fr"\}\/feed\.xml`/);
});

test("the feed page exists in both languages, with the e-mail form first, the address to copy and the latest posts", () => {
  for (const f of ["app/(en)/feed/page.tsx", "app/fr/feed/page.tsx"]) assert.match(read(f), /FeedPage/);
  const page = read("app/components/feed/FeedPage.tsx");
  assert.match(page, /SubscribeForm/);
  assert.match(page, /CopyField/);
  assert.match(page, /absoluteUrl\(locale, "\/feed\.xml"\)|\/feed\.xml/);
  assert.match(page, /postsOf\(locale\)/);
  assert.ok(page.indexOf("SubscribeForm") < page.indexOf("CopyField"), "the e-mail subscribe is the main option: it comes before the feed address");
  assert.match(read("app/sitemap.ts"), /"\/feed"/);
});

test("the feed page's words exist in both languages", () => {
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).feedPage;
    for (const k of ["eyebrow", "title", "lead", "emailTitle", "emailLead", "rssTitle", "rssWhat", "addressLabel", "copy", "copied", "latest", "reader"]) assert.ok(typeof m[k] === "string" && m[k].length > 0, `${l}: feedPage.${k}`);
  }
});

test("every human-facing RSS link goes to /feed/, never to the raw XML", () => {
  const post = read("app/components/pages/PostPage.tsx");
  const home = read("app/components/pages/HomePage.tsx");
  const bar = read("app/components/TopBar.tsx");
  const footer = read("app/components/SiteFooter.tsx");
  for (const [name, src] of [["PostPage", post], ["HomePage", home], ["TopBar", bar], ["SiteFooter", footer]]) assert.match(src, /\/feed\/`|localizedPath\(locale, "\/feed"\)/, `${name} links /feed/`);
  assert.doesNotMatch(post + home + bar, /\/feed\.xml/);
  assert.doesNotMatch(footer, /\/feed\.xml/);
  assert.match(footer, /\/atom\.xml/, "the Atom file stays a file, for readers");
});

test("on a post, « Subscribe » goes to the e-mail form and the feed is a secondary link", () => {
  const page = read("app/components/pages/PostPage.tsx");
  const form = read("app/components/newsletter/NewsletterSection.tsx");
  assert.match(page, /variant="primary"[^]*?href="#subscribe"/);
  assert.match(page, /variant="ghost"[^]*?localizedPath\(locale, "\/feed"\)/);
  assert.match(form, /id="subscribe"/);
  assert.match(page, /<NewsletterSection locale=\{locale\} where="post" \/>/);
});
