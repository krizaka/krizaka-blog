import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeEntities, extractLinks, resolve, isInternal, isPage, isSoft, follow, checkExternal, SOFT_HOSTS } from "../scripts/check-links.mjs";

const root = new URL("..", import.meta.url).pathname;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/* The bug of 2026-10-16: the post page's RSS link was a next/link, so the router fetched /feed.xml/__next._tree.txt (404)
   on every post, and a click went through a failed client navigation. A file that is not a page is a plain <a>. */
test("next/link never points at a file that is not a page (feeds, images, text)", () => {
  const offenders = [];
  for (const f of walk(join(root, "app")).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/<Link\b[^>]*?href=[^>]*?\.(xml|txt|png|svg|json)\b[^>]*>/g)) offenders.push(`${f.replace(root, "")}: ${m[0]}`);
  }
  assert.deepEqual(offenders, []);
});

test("the Mac-app post cites the historical scope source, not the removed main-branch file", () => {
  const source = "https://github.com/krizaka/orazaka/blob/5d8704b0af6e751cb56aedbc0b07f6c68a379714/apps/desktop/src-tauri/src/scope.rs";
  for (const locale of ["en", "fr"]) {
    const post = readFileSync(join(root, `content/posts/why-orazaka-has-a-mac-app.${locale}.mdx`), "utf8");
    const citations = [...post.matchAll(/\]\((https:\/\/github\.com\/krizaka\/orazaka\/blob\/[^)]+\/scope\.rs)\)/g)].map((m) => m[1]);
    assert.deepEqual(citations, [source], locale);
  }
});

test("extractLinks reads href, src, every srcset candidate, poster, absolute meta content and feed links", () => {
  const html = `<a href="/posts/a/">a</a><img src="/i.png" srcset="https://cdn/x-480.webp 480w, https://cdn/x-960.webp 960w"><video poster="/p.jpg"></video>
  <meta property="og:image" content="https://blog.krizaka.com/og/a.png"><meta name="description" content="not a url">
  <a href="mailto:x@y.z">m</a><a href="#top">t</a><link>https://blog.krizaka.com/posts/b/</link><loc>https://blog.krizaka.com/fr/</loc>`;
  assert.deepEqual(extractLinks(html).sort(), ["/i.png", "/p.jpg", "/posts/a/", "https://blog.krizaka.com/fr/", "https://blog.krizaka.com/og/a.png", "https://blog.krizaka.com/posts/b/", "https://cdn/x-480.webp", "https://cdn/x-960.webp"].sort());
});

test("resolve maps the production host onto the base, drops fragments and other schemes", () => {
  const base = "http://localhost:3000";
  assert.equal(resolve("https://blog.krizaka.com/posts/a/#x", `${base}/`, base, "https://blog.krizaka.com"), `${base}/posts/a/`);
  assert.equal(resolve("../b/", `${base}/posts/a/`, base, "https://blog.krizaka.com"), `${base}/posts/b/`);
  assert.equal(resolve("ftp://x", `${base}/`, base), null);
  assert.ok(isInternal(`${base}/x`, base));
  assert.ok(!isInternal("https://github.com/krizaka", base));
});

test("the hosts that refuse robots are a short explicit list; nothing else is soft", () => {
  assert.ok(SOFT_HOSTS.length <= 15);
  assert.ok(isSoft("https://www.linkedin.com/in/x"));
  assert.ok(!isSoft("https://github.com/krizaka"));
});

const fake = (routes) => async (url) => {
  const r = routes[url] ?? { status: 404 };
  return { status: r.status, headers: new Map(Object.entries(r.headers ?? {})), body: null };
};

test("follow walks redirects and catches a loop", async () => {
  const ok = await follow("http://a/1", { fetchImpl: fake({ "http://a/1": { status: 308, headers: { location: "/2" } }, "http://a/2": { status: 200 } }) });
  assert.equal(ok.status, 200);
  const loop = await follow("http://a/1", { fetchImpl: fake({ "http://a/1": { status: 301, headers: { location: "/2" } }, "http://a/2": { status: 302, headers: { location: "/1" } } }) });
  assert.match(loop.error, /loop/);
});

test("an external 404 is broken at once; a 503 is retried", async () => {
  let calls = 0;
  const flaky = async (url, init) => {
    calls++;
    return { status: calls < 3 ? 503 : 200, headers: new Map(), body: null, method: init.method };
  };
  assert.equal((await checkExternal("https://x/", { fetchImpl: flaky, wait: 1 })).status, 200);
  const gone = await checkExternal("https://x/", { fetchImpl: fake({}), wait: 1 });
  assert.equal(gone.status, 404);
  assert.equal(gone.transient, false);
});

test("entities in an attribute are decoded (a share link with an apostrophe is not cut at &#x27;)", () => {
  assert.equal(decodeEntities("t=L&#x27;anatomie&amp;x=1&#39;"), "t=L'anatomie&x=1'");
  assert.deepEqual(extractLinks('<a href="https://r.example/submit?title=L&#x27;anatomie&amp;u=1">r</a>'), ["https://r.example/submit?title=L'anatomie&u=1"]);
});

test("srcset is read as the HTML spec reads it: a data: URL's comma does not split a candidate", () => {
  const html = '<source srcset="data:image/gif;base64,R0lGODlh,AQAB"><img srcset="/a-480.webp 480w, /a-960.webp 960w">';
  assert.deepEqual(extractLinks(html).sort(), ["/a-480.webp", "/a-960.webp"]);
});

test("a preconnect or dns-prefetch hint is not a link (its origin need not answer a page)", () => {
  const html = '<link rel="preconnect" href="https://cdn.example.com"/><link rel="dns-prefetch" href="https://x.example.com"><link rel="stylesheet" href="/a.css">';
  assert.deepEqual(extractLinks(html), ["/a.css"]);
});

test("the paths the CDN's edge injects on the live site are not crawled (Cloudflare e-mail protection)", () => {
  assert.deepEqual(extractLinks('<a href="/cdn-cgi/l/email-protection#abc">mail</a><a href="/posts/a/">a</a>'), ["/posts/a/"]);
});

test("an XSLT stylesheet is checked but not crawled: its {link} are templates, not addresses", () => {
  assert.equal(isPage("http://localhost:3000/feed.xsl", "application/xslt+xml"), false);
  assert.equal(isPage("http://localhost:3000/feed.xsl", "text/xsl; charset=utf-8"), false);
  assert.equal(isPage("http://localhost:3000/feed.xml", "application/rss+xml"), true);
  assert.equal(isPage("http://localhost:3000/posts/a/", "text/html"), true);
});

/* The bug of 2026-10-23: the mac-app post linked orazaka's apps/desktop/src-tauri/src/scope.rs (404 since the folder scope
   moved to krizaka-tauri-kit, ADR-005). The CI link check failed on it. No post may point at that removed path. */
test("no post links to the desktop scope file that moved to krizaka-tauri-kit", () => {
  const offenders = walk(join(root, "content/posts"))
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => readFileSync(f, "utf8").includes("krizaka/orazaka/blob/main/apps/desktop/src-tauri/src/scope.rs"))
    .map((f) => f.replace(root, ""));
  assert.deepEqual(offenders, []);
});
