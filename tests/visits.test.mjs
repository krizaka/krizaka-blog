// The cookieless visit count of the blog (krizaka-internal#4122): the function, the page's request, and what is never kept.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { referrerHost, visitPayload, VISIT_URL } from "../lib/visit-beacon.ts";
import { render, VISITS_TARGET } from "../scripts/bundle-functions.mjs";

const require = createRequire(import.meta.url);
const { handle } = require("../functions/packages/visits/count/index.js");
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const ENV = { DATABASE_VISITS_URL: "postgres://visits_app:x@db.example:25061/krizaka_visits" };
const NOW = new Date("2026-11-17T12:00:00Z");
const SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
const call = (over = {}) => ({
  __ow_method: "post",
  __ow_headers: { "user-agent": SAFARI },
  path: "/story/the-start/",
  ref: "news.ycombinator.com",
  ...over,
});

/** A fake database that applies the cap like the real statement: a new key past it writes nothing. */
function fakeDb(cap = 2000) {
  const rows = new Map();
  const calls = [];
  const query = async (text, params = []) => {
    calls.push({ text, params });
    const [site, page, day, referrer, max] = params;
    const key = JSON.stringify([site, page, day, referrer]);
    if (!rows.has(key) && rows.size >= Math.min(cap, max)) return [];
    rows.set(key, (rows.get(key) ?? 0) + 1);
    return [{}];
  };
  return { rows, calls, query };
}

test("the function counts one row per page, day and referrer domain, and answers 204", async () => {
  const db = fakeDb();
  const r = await handle(call(), ENV, db.query, NOW);
  assert.equal(r.statusCode, 204);
  assert.deepEqual(
    [...db.rows.keys()].map((k) => JSON.parse(k)),
    [["blog", "/story/the-start", "2026-11-17", "news.ycombinator.com"]],
  );
  await handle(call(), ENV, db.query, NOW);
  assert.deepEqual([...db.rows.values()], [2]);
});

test("nothing personal reaches the database: no agent, no address, no query, no cookie", async () => {
  const db = fakeDb();
  await handle(
    call({
      path: "/search/?q=my+name",
      ref: "x.com",
      __ow_headers: { "user-agent": SAFARI, cookie: "a=b", "x-forwarded-for": "203.0.113.9" },
    }),
    ENV,
    db.query,
    NOW,
  );
  const sent = JSON.stringify(db.calls);
  assert.doesNotMatch(sent, /Mozilla|203\.0\.113|a=b|my\+name|q=/);
  assert.equal(db.calls[0].params.length, 5, "site, page, day, referrer domain, cap");
});

test("robots, non-pages and our own links count for nothing or for no source", async () => {
  const db = fakeDb();
  for (const bad of [
    call({ __ow_headers: { "user-agent": "Googlebot/2.1" } }),
    call({ __ow_headers: {} }),
    call({ path: "/api/visits/count" }),
    call({ path: "javascript:alert(1)" }),
    call({ __ow_method: "get" }),
  ])
    assert.equal((await handle(bad, ENV, db.query, NOW)).statusCode, 204);
  assert.equal(db.rows.size, 0);
  await handle(call({ ref: "blog.krizaka.com" }), ENV, db.query, NOW);
  assert.equal(JSON.parse([...db.rows.keys()][0])[3], "");
});

test("the daily cap holds: made-up pages stop at the ceiling", async () => {
  const db = fakeDb(3);
  for (const p of ["/a/", "/b/", "/c/", "/d/", "/e/"]) await handle(call({ path: p }), ENV, db.query, NOW);
  assert.equal(db.rows.size, 3);
});

test("it fails closed: a database error, a missing configuration or a thrown query is still a 204 and never a header", async () => {
  const boom = async () => {
    throw new Error("connection refused");
  };
  const r = await handle(call(), ENV, boom, NOW);
  assert.equal(r.statusCode, 204);
  assert.equal(r.body, "");
  assert.equal((await handle(call(), {}, boom, NOW)).statusCode, 204);
  assert.equal((await handle(call(), { DATABASE_VISITS_URL: "unset" }, boom, NOW)).statusCode, 204);
  assert.equal(
    Object.keys(r.headers).some((h) => h.toLowerCase() === "set-cookie"),
    false,
    "no Set-Cookie",
  );
});

test("the bundled library is the installed one, and the action is wired in project.yml and the app spec", () => {
  assert.equal(
    read("functions/packages/visits/count/visits.mjs"),
    render(...bundleArgs()),
    "run `npm run functions:bundle`",
  );
  assert.ok(VISITS_TARGET.pathname.endsWith("visits/count/visits.mjs"));
  assert.match(read("functions/project.yml"), /name: visits[\s\S]*DATABASE_VISITS_URL[\s\S]*name: count/);
  assert.match(read(".do/app.yaml"), /DATABASE_VISITS_URL, scope: RUN_AND_BUILD_TIME, type: SECRET/);
});
function bundleArgs() {
  return [
    new URL("../node_modules/@krizaka/visits/dist/index.js", import.meta.url),
    new URL("../node_modules/@krizaka/visits/package.json", import.meta.url),
    "@krizaka/visits",
    "visit count",
  ];
}

test("the page sends the path and the referring host only, with no cookie and no identifier", () => {
  assert.deepEqual(visitPayload("/story/x/", "https://www.google.com/search?q=secret#frag", "blog.krizaka.com"), {
    path: "/story/x/",
    ref: "www.google.com",
  });
  assert.equal(referrerHost("https://blog.krizaka.com/", "blog.krizaka.com"), "");
  assert.equal(referrerHost("", "blog.krizaka.com"), "");
  assert.equal(referrerHost("android-app://com.x", "blog.krizaka.com"), "");
  assert.equal(VISIT_URL, "/api/visits/count");
  const beacon = read("lib/visit-beacon.ts");
  assert.match(beacon, /credentials: "omit"/);
  assert.match(beacon, /keepalive: true/);
  assert.match(beacon, /\.catch\(\(\) => undefined\)/, "an error is ignored");
  assert.doesNotMatch(beacon, /document\.cookie|localStorage|sessionStorage|navigator\.userAgent|crypto\.randomUUID/);
  assert.match(read("app/components/SiteRoot.tsx"), /<VisitCount \/>/);
});
