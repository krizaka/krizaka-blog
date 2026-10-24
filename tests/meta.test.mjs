import test from "node:test";
import assert from "node:assert/strict";
import { metaProblems, pageProblems } from "../scripts/check-meta.mjs";

/* What a built page shows a search engine: a title of at most 60 characters, a description of at most 155, one h1, and an
   alt on every image (empty for a decorative one). */
const page = ({ title = "A short title", description = "A short description.", body = "<h1>Title</h1>" } = {}) =>
  `<html><head><title>${title}</title><meta name="description" content="${description}"/></head><body>${body}</body></html>`;

test("a page within the limits has no problem", () => assert.deepEqual(metaProblems(page()), []));
test("a title over 60 characters is refused", () => assert.match(metaProblems(page({ title: "x".repeat(61) }))[0], /title/));
test("entities count as one character", () => assert.deepEqual(metaProblems(page({ title: "Ce qu&#x27;on a — " + "x".repeat(42) })), []));
test("a description over 155 characters is refused, a missing one too", () => {
  assert.match(metaProblems(page({ description: "y".repeat(156) }))[0], /description/);
  assert.match(metaProblems("<html><head><title>T</title></head><body><h1>T</h1></body></html>")[0], /description/);
});
test("one h1, no more, no less", () => {
  assert.match(metaProblems(page({ body: "<p>no heading</p>" }))[0], /h1/);
  assert.match(metaProblems(page({ body: "<h1>a</h1><h1 class='x'>b</h1>" }))[0], /h1/);
});
test("every image carries an alt", () => {
  assert.match(metaProblems(page({ body: '<h1>T</h1><img src="a.webp">' }))[0], /alt/);
  assert.deepEqual(metaProblems(page({ body: '<h1>T</h1><img alt="" src="a.webp"><img src="b.webp" alt="A riad">' })), []);
});
test("a NaN or an undefined in the text is refused (not in scripts)", () => {
  assert.match(metaProblems(page({ body: "<h1>T</h1><dd>US$NaN</dd>" }))[0], /NaN/);
  assert.match(metaProblems(page({ body: "<h1>T</h1><p>(undefined s of generation)</p>" }))[0], /undefined/);
  assert.deepEqual(metaProblems(page({ body: '<h1>T</h1><script>self.x = undefined</script>' })), []);
});

/* The cover is the LCP of a post: responsive (`srcset` + `sizes`), AVIF first, fetched at high priority and preloaded. */
import { coverProblems } from "../scripts/check-meta.mjs";
const avif = "https://c.example/blog/a-480.1.avif 480w, https://c.example/blog/a-768.2.avif 768w, https://c.example/blog/a-1024.3.avif 1024w";
const webp = avif.replaceAll("avif", "webp");
const good = `<html><head><link rel="preload" as="image" imagesrcset="${avif}" imagesizes="100vw" type="image/avif" fetchpriority="high"/></head><body><article><picture><source type="image/avif" srcSet="${avif}" sizes="100vw"/><img class="bl-cover bl-img" src="https://c.example/blog/a-768.2.webp" srcSet="${webp}" sizes="100vw" width="1024" height="1024" alt="x" fetchPriority="high"/></picture></article></body></html>`;
test("a post's cover with AVIF and WebP renditions, high priority and a preload has no problem", () => assert.deepEqual(coverProblems(good), []));
test("a cover without a srcset, an AVIF source, a high priority or a preload is reported", () => {
  assert.equal(coverProblems(good.replace(/ srcSet="[^"]*webp 1024w"/, "")).length, 1);
  assert.equal(coverProblems(good.replace(/<source[^>]*>/, "")).length, 1);
  assert.equal(coverProblems(good.replace('fetchPriority="high"', "")).length, 1);
  assert.equal(coverProblems(good.replace(/<link[^>]*>/, "")).length, 1);
  assert.equal(coverProblems("<html><body><h1>x</h1></body></html>").length, 1, "a post page has a cover");
});

/* A retired post's stub (app/components/pages/RetiredPost.tsx, exported as the static page at the old address): it has no title,
   no description and no h1, so it is checked as a stub: a 0-second refresh, a canonical to the same address, noindex, and a
   visible link. The article checks stay on every live post. */
const stub = (path = "/story/why-krizaka/", { refresh = path, canonical = `https://blog.krizaka.com${path}`, robots = "noindex, follow", link = path } = {}) =>
  `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="robots" content="${robots}"/><link rel="canonical" href="${canonical}"/></head>` +
  `<body><meta http-equiv="refresh" content="0; url=${refresh}"/><div><p>This post is now a chapter of the story.</p><p><a href="${link}">Chapter 3</a></p></div></body></html>`;

test("a retired post's stub is a valid page: refresh, canonical, noindex and a visible link", () => {
  assert.deepEqual(pageProblems(stub()), []);
  assert.deepEqual(pageProblems(stub("/fr/story/pourquoi-krizaka/#ligne")), []);
});
test("a stub with no refresh, a canonical elsewhere, no noindex or no visible link is refused", () => {
  assert.match(pageProblems(stub("/story/why-krizaka/", { refresh: "" }))[0], /refresh/);
  assert.match(pageProblems(stub("/story/why-krizaka/", { canonical: "https://blog.krizaka.com/story/other/" })).join(), /canonical/);
  assert.match(pageProblems(stub("/story/why-krizaka/", { robots: "index, follow" })).join(), /noindex/);
  assert.match(pageProblems(stub("/story/why-krizaka/", { link: "/story/other/" })).join(), /visible link/);
});
test("a live post is still checked as an article: a missing h1 is refused even through pageProblems", () => {
  assert.match(pageProblems(page({ body: "<p>no heading</p>" }))[0], /h1/);
  assert.deepEqual(pageProblems(page()), []);
});
test("a stub's canonical may carry Next's trailing slash after the section anchor (the same address)", () => {
  assert.deepEqual(pageProblems(stub("/story/what-a-gpu-costs/#the-price-of-a-result", { canonical: "https://blog.krizaka.com/story/what-a-gpu-costs/#the-price-of-a-result/" })), []);
});
