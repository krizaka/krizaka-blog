import test from "node:test";
import assert from "node:assert/strict";
import { SHARE_TARGETS, shareLinks, shareUrl } from "../lib/share.ts";
import { existsSync, readFileSync } from "node:fs";

/* Share: plain links to each network's own share page, the post's URL and title encoded, nothing else. */
const url = "https://blog.krizaka.com/posts/what-image-and-video-generation-costs/";
const title = "What image & video generation costs — measured";

test("every share link carries the post's URL, encoded, and points at the network's own share page", () => {
  const links = shareLinks(url, title);
  assert.deepEqual(links.map((l) => l.target), [...SHARE_TARGETS]);
  const hosts = { x: "x.com", linkedin: "www.linkedin.com", hackernews: "news.ycombinator.com", reddit: "www.reddit.com" };
  for (const { target, href } of links) {
    assert.ok(href.includes(encodeURIComponent(url)), `${target} carries the URL`);
    if (target === "email") {
      assert.match(href, /^mailto:\?subject=/);
      continue;
    }
    const u = new URL(href);
    assert.equal(u.protocol, "https:");
    assert.equal(u.hostname, hosts[target]);
  }
});

test("a title with & and # cannot break out of its query parameter", () => {
  const href = shareUrl("hackernews", url, "A & B #1");
  const u = new URL(href);
  assert.equal(u.searchParams.get("t"), "A & B #1");
  assert.equal(u.searchParams.get("u"), url);
  assert.equal(new URL(shareUrl("x", url, "A & B #1")).searchParams.get("text"), "A & B #1");
});

test("no share link adds tracking parameters", () => {
  for (const { href } of shareLinks(url, title)) assert.doesNotMatch(href, /utm_|fbclid|ref=/);
});

/* « Read later » and the saved page are gone (krizaka-blog#123: the blog is one page): a post ends with sharing only, and
   /saved/ is a stub to the story. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("a post's end shares it and saves nothing: no « Read later », no saved list in the browser", () => {
  const engage = read("app/components/engage/PostEngage.tsx");
  assert.match(engage, /<ShareBar /);
  assert.doesNotMatch(engage, /SaveButton|useSaved/);
  for (const f of ["app/components/engage/SaveButton.tsx", "app/components/engage/useSaved.ts", "lib/saved.ts", "app/components/pages/SavedPage.tsx"]) {
    assert.ok(!existsSync(new URL(`../${f}`, import.meta.url)), `${f} is gone`);
  }
});
