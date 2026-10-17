import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feedXsl } from "../lib/feed-xsl.ts";

/* Opening /feed.xml in a browser shows a page, not raw XML (an XSLT stylesheet RSS readers ignore); the post's « Subscribe »
   is the e-mail form, the feed a quiet second link. The built feeds are parsed as XML in CI (.github/workflows/ci.yml). */
const words = (tag) => ({ title: `T${tag}`, lead: "L & <b>", copy: "C", latest: "N", back: "B", email: "E", reader: "R" });

test("the feed stylesheet: XSLT 1.0, a branch per language, the feed's own address to copy, words escaped", () => {
  const xsl = feedXsl(words("en"), words("fr"));
  assert.match(xsl, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<xsl:stylesheet version="1\.0"/);
  assert.match(xsl, /starts-with\(rss\/channel\/language, 'fr'\)/);
  assert.match(xsl, /atom:link\[@rel='self'\]\/@href/);
  assert.ok(xsl.includes("Ten") && xsl.includes("Tfr"));
  assert.ok(xsl.includes("L &amp; &lt;b&gt;") && !xsl.includes("L & <b>"));
  assert.match(xsl, /#subscribe/);
});

test("both RSS feeds reference the stylesheet before their root element", () => {
  const src = readFileSync(new URL("../lib/feeds.ts", import.meta.url), "utf8");
  assert.match(src, /<\?xml version="1\.0" encoding="UTF-8"\?>\\n<\?xml-stylesheet type="text\/xsl" href="\/feed\.xsl"\?>\\n<rss version="2\.0"/);
});

test("on a post, « Subscribe » goes to the e-mail form and the feed is a typed, secondary link", () => {
  const page = readFileSync(new URL("../app/components/pages/PostPage.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../app/components/newsletter/NewsletterSection.tsx", import.meta.url), "utf8");
  assert.match(page, /variant="primary"[^]*?href="#subscribe"/);
  assert.match(page, /variant="ghost"[^]*?\/feed\.xml`\} type="application\/rss\+xml"/);
  assert.match(form, /id="subscribe"/);
  assert.match(page, /<NewsletterSection locale=\{locale\} where="post" \/>/);
});
