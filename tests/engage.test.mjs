import test from "node:test";
import assert from "node:assert/strict";
import { SHARE_TARGETS, shareLinks, shareUrl } from "../lib/share.ts";
import { SAVED_KEY, SAVED_MAX, isSaved, mergeSaved, parseSaved, readSaved, removeSaved, toggleSaved } from "../lib/saved.ts";

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

/* Saved posts: a list in the reader's browser, by slug, newest first. */
const fake = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = String(v)), data };
};

test("saving a post twice un-saves it; the list is newest first", () => {
  const s = fake();
  assert.equal(toggleSaved(s, "first-post", new Date("2026-10-01T00:00:00Z")), true);
  assert.equal(toggleSaved(s, "second-post", new Date("2026-10-02T00:00:00Z")), true);
  assert.deepEqual(readSaved(s).map((e) => e.slug), ["second-post", "first-post"]);
  assert.equal(toggleSaved(s, "first-post"), false);
  assert.deepEqual(readSaved(s).map((e) => e.slug), ["second-post"]);
  removeSaved(s, "second-post");
  assert.deepEqual(readSaved(s), []);
});

test("a malformed or foreign value reads as an empty list, and bad entries are dropped", () => {
  assert.deepEqual(parseSaved("not json"), []);
  assert.deepEqual(parseSaved('{"slug":"x"}'), []);
  const raw = JSON.stringify([
    { slug: "ok-post", at: "2026-10-01T00:00:00Z" },
    { slug: "../etc/passwd", at: "2026-10-01T00:00:00Z" },
    { slug: "no-date" },
    { slug: "ok-post", at: "2026-10-03T00:00:00Z" },
    null,
  ]);
  assert.deepEqual(parseSaved(raw), [{ slug: "ok-post", at: "2026-10-01T00:00:00Z" }]);
  assert.equal(toggleSaved(fake(), "Not A Slug"), false);
});

test("storage that refuses (private mode) never throws and reports the post as not saved", () => {
  const refusing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  assert.deepEqual(readSaved(refusing), []);
  assert.equal(toggleSaved(refusing, "a-post"), false);
  assert.deepEqual(readSaved(null), []);
});

test("the list is bounded", () => {
  const many = Array.from({ length: SAVED_MAX + 20 }, (_, i) => ({ slug: `p-${i}`, at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
  const s = fake({ [SAVED_KEY]: JSON.stringify(many) });
  assert.equal(readSaved(s).length, SAVED_MAX);
});

test("merging this browser's list with the account's keeps one entry per post, the earliest save", () => {
  const local = [{ slug: "a", at: "2026-10-05T00:00:00Z" }, { slug: "b", at: "2026-10-01T00:00:00Z" }];
  const remote = [{ slug: "a", at: "2026-10-02T00:00:00Z" }, { slug: "c", at: "2026-10-03T00:00:00Z" }];
  const merged = mergeSaved(local, remote);
  assert.deepEqual(merged, [
    { slug: "c", at: "2026-10-03T00:00:00Z" },
    { slug: "a", at: "2026-10-02T00:00:00Z" },
    { slug: "b", at: "2026-10-01T00:00:00Z" },
  ]);
  assert.ok(isSaved(merged, "b"));
  assert.ok(!isSaved(merged, "d"));
});
