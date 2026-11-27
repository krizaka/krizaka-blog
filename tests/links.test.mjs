import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  decodeEntities,
  srcsetUrls,
  extractLinks,
  resolve,
  isInternal,
  isPage,
  isSoft,
  follow,
  checkExternal,
  crawl,
  SOFT_HOSTS,
} from "../scripts/check-links.mjs";
import { resolveLinks } from "../lib/links.ts";

const root = new URL("..", import.meta.url).pathname;
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/* The bug of 2026-10-16: the post page's RSS link was a next/link, so the router fetched /feed.xml/__next._tree.txt (404)
   on every post, and a click went through a failed client navigation. A file that is not a page is a plain <a>. */
test("next/link never points at a file that is not a page (feeds, images, text)", () => {
  const offenders = [];
  for (const f of walk(join(root, "app")).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/<Link\b[^>]*?href=[^>]*?\.(xml|txt|png|svg|json)\b[^>]*>/g))
      offenders.push(`${f.replace(root, "")}: ${m[0]}`);
  }
  assert.deepEqual(offenders, []);
});

test("the Mac-app section of chapter 5 cites the historical scope source, not the removed main-branch file", () => {
  const source =
    "https://github.com/krizaka/sovkora/blob/5d8704b0af6e751cb56aedbc0b07f6c68a379714/apps/desktop/src-tauri/src/scope.rs";
  for (const locale of ["en", "fr"]) {
    const post = resolveLinks(
      readFileSync(join(root, `content/chapters/one-interface-everywhere.${locale}.mdx`), "utf8"),
    );
    const citations = [
      ...post.matchAll(/\]\((https:\/\/github\.com\/krizaka\/sovkora\/blob\/[^)]+\/scope\.rs)\)/g),
    ].map((m) => m[1]);
    assert.deepEqual(citations, [source], locale);
  }
});

test("extractLinks reads href, src, every srcset candidate, poster, absolute meta content and feed links", () => {
  const html = `<a href="/posts/a/">a</a><img src="/i.png" srcset="https://cdn/x-480.webp 480w, https://cdn/x-960.webp 960w"><video poster="/p.jpg"></video>
  <meta property="og:image" content="https://blog.krizaka.com/og/a.png"><meta name="description" content="not a url">
  <a href="mailto:x@y.z">m</a><a href="#top">t</a><link>https://blog.krizaka.com/posts/b/</link><loc>https://blog.krizaka.com/fr/</loc>`;
  assert.deepEqual(
    extractLinks(html).sort(),
    [
      "/i.png",
      "/p.jpg",
      "/posts/a/",
      "https://blog.krizaka.com/fr/",
      "https://blog.krizaka.com/og/a.png",
      "https://blog.krizaka.com/posts/b/",
      "https://cdn/x-480.webp",
      "https://cdn/x-960.webp",
    ].sort(),
  );
});

test("resolve maps the production host onto the base, drops fragments and other schemes", () => {
  const base = "http://localhost:3000";
  assert.equal(
    resolve("https://blog.krizaka.com/posts/a/#x", `${base}/`, base, "https://blog.krizaka.com"),
    `${base}/posts/a/`,
  );
  assert.equal(resolve("../b/", `${base}/posts/a/`, base, "https://blog.krizaka.com"), `${base}/posts/b/`);
  assert.equal(resolve("ftp://x", `${base}/`, base), null);
  assert.ok(isInternal(`${base}/x`, base));
  assert.ok(!isInternal("https://github.com/krizaka", base));
});

test("the hosts that refuse robots are a short explicit list; nothing else is soft", () => {
  assert.ok(SOFT_HOSTS.length <= 15);
  assert.ok(isSoft("https://www.linkedin.com/in/x"));
  // opensource.org answers the CI runner 403 and a browser 200 (krizaka-internal#4034): reported, never fatal.
  assert.ok(isSoft("https://opensource.org/osd"));
  assert.ok(!isSoft("https://github.com/krizaka"));
});

const fake = (routes) => async (url) => {
  const r = routes[url] ?? { status: 404 };
  return { status: r.status, headers: new Map(Object.entries(r.headers ?? {})), body: null };
};

test("follow walks redirects and catches a loop", async () => {
  const ok = await follow("http://a/1", {
    fetchImpl: fake({ "http://a/1": { status: 308, headers: { location: "/2" } }, "http://a/2": { status: 200 } }),
  });
  assert.equal(ok.status, 200);
  const loop = await follow("http://a/1", {
    fetchImpl: fake({
      "http://a/1": { status: 301, headers: { location: "/2" } },
      "http://a/2": { status: 302, headers: { location: "/1" } },
    }),
  });
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
  assert.deepEqual(extractLinks('<a href="https://r.example/submit?title=L&#x27;anatomie&amp;u=1">r</a>'), [
    "https://r.example/submit?title=L'anatomie&u=1",
  ]);
});

test("srcset is read as the HTML spec reads it: a data: URL's comma does not split a candidate", () => {
  const html = '<source srcset="data:image/gif;base64,R0lGODlh,AQAB"><img srcset="/a-480.webp 480w, /a-960.webp 960w">';
  assert.deepEqual(extractLinks(html).sort(), ["/a-480.webp", "/a-960.webp"]);
});

test("a preconnect or dns-prefetch hint is not a link (its origin need not answer a page)", () => {
  const html =
    '<link rel="preconnect" href="https://cdn.example.com"/><link rel="dns-prefetch" href="https://x.example.com"><link rel="stylesheet" href="/a.css">';
  assert.deepEqual(extractLinks(html), ["/a.css"]);
});

test("the paths the CDN's edge injects on the live site are not crawled (Cloudflare e-mail protection)", () => {
  assert.deepEqual(extractLinks('<a href="/cdn-cgi/l/email-protection#abc">mail</a><a href="/posts/a/">a</a>'), [
    "/posts/a/",
  ]);
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
    .filter((f) =>
      /krizaka\/(orazaka|sovkora)\/blob\/main\/apps\/desktop\/src-tauri\/src\/scope\.rs/.test(
        resolveLinks(readFileSync(f, "utf8")),
      ),
    )
    .map((f) => f.replace(root, ""));
  assert.deepEqual(offenders, []);
});

test("srcsetUrls strips trailing commas from URL candidates without backtracking", () => {
  assert.deepEqual(srcsetUrls("https://cdn/a.webp,,, https://cdn/b.webp 960w"), [
    "https://cdn/a.webp",
    "https://cdn/b.webp",
  ]);
});

test("checkExternal falls back to GET on HEAD refusal, cancels bodies, and classifies network errors", async () => {
  let cancelled = false;
  const headRefused = async (_url, init) => {
    if (init.method === "HEAD") {
      return { status: 405, headers: new Map(), body: null };
    }
    return {
      status: 200,
      headers: new Map(),
      body: {
        cancel: async () => {
          cancelled = true;
        },
      },
    };
  };
  const ok = await checkExternal("https://example.com/get-only", { fetchImpl: headRefused, wait: 1 });
  assert.equal(ok.status, 200);
  assert.equal(ok.transient, false);
  assert.equal(cancelled, true);

  let timeoutCalls = 0;
  const timedOut = await checkExternal("https://example.com/slow", {
    tries: 2,
    wait: 1,
    fetchImpl: async () => {
      timeoutCalls++;
      const err = new Error("aborted");
      err.name = "TimeoutError";
      throw err;
    },
  });
  assert.equal(timeoutCalls, 2);
  assert.equal(timedOut.error, "timeout");
  assert.equal(timedOut.transient, true);

  let dnsCalls = 0;
  const missingHost = await checkExternal("https://no-such-host.invalid/", {
    tries: 3,
    wait: 1,
    fetchImpl: async () => {
      dnsCalls++;
      const err = new Error("fetch failed");
      err.cause = { code: "ENOTFOUND" };
      throw err;
    },
  });
  assert.equal(dnsCalls, 1);
  assert.equal(missingHost.error, "ENOTFOUND");
  assert.equal(missingHost.transient, false);
});

test("crawl walks internal pages, markdown links, non-page assets, and external URLs", async () => {
  const base = "http://localhost:3000";
  const host = "https://blog.krizaka.com";
  const makeResp = (status, bodyText = "", contentType = "text/html") => ({
    status,
    headers: new Map([["content-type", contentType]]),
    body: { cancel: async () => {} },
    text: async () => bodyText,
  });
  const routes = new Map([
    [
      `${base}/`,
      makeResp(
        200,
        '<a href="/page/">p</a><a href="/page/">dup</a><a href="/broken/">b</a><a href="/boom/">x</a><img src="/logo.png"><a href="https://ok.example/1">ok</a><a href="https://ok.example/1">ok2</a><a href="https://dead.example/404">dead</a><a href="https://opensource.org/osd">soft</a><a href="https://flaky.example/503">flaky</a>',
      ),
    ],
    [`${base}/fr/`, makeResp(200, '<a href="/page/">fr</a>')],
    [`${base}/page/`, makeResp(200, "<p>ok</p>")],
    [`${base}/logo.png`, makeResp(200, "png", "image/png")],
    [`${base}/broken/`, makeResp(404, "missing")],
    [`${base}/feed.xml`, makeResp(200, "<rss/>", "application/rss+xml")],
    [`${base}/atom.xml`, makeResp(200, "<feed/>", "application/atom+xml")],
    [`${base}/fr/feed.xml`, makeResp(200, "<rss/>", "application/rss+xml")],
    [`${base}/fr/atom.xml`, makeResp(200, "<feed/>", "application/atom+xml")],
    [`${base}/sitemap.xml`, makeResp(200, "<urlset/>", "application/xml")],
    [`${base}/llms.txt`, makeResp(200, "Read [docs](https://ok.example/md) and [home](/page/)", "text/plain")],
    [`${base}/404.html`, makeResp(200, "<h1>404</h1>")],
    ["https://ok.example/1", makeResp(200)],
    ["https://ok.example/md", makeResp(200)],
    ["https://dead.example/404", makeResp(404)],
    ["https://opensource.org/osd", makeResp(403)],
    ["https://flaky.example/503", makeResp(503)],
  ]);
  const fetchImpl = async (url) => {
    if (url === `${base}/boom/`) {
      throw new Error("socket hang up");
    }
    return routes.get(url) ?? makeResp(404);
  };
  const origLog = console.log;
  const origErr = console.error;
  const logs = [];
  const errs = [];
  console.log = (...a) => logs.push(a.join(" "));
  console.error = (...a) => errs.push(a.join(" "));
  try {
    const failures = await crawl({ base, host, external: true, fetchImpl, wait: 1 });
    assert.equal(failures, 3, "internal 404, internal fetch error, and external 404");
    assert.ok(logs.some((l) => l.includes("not fatal")));
    const brokenUrls = errs.map((e) => e.split(" ")[1]).filter((u) => URL.canParse(u));
    assert.ok(brokenUrls.some((u) => new URL(u).host === "dead.example" && new URL(u).pathname === "/404"));
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
});
