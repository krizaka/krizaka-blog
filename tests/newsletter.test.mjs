import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  publishedBetween,
  versionsOf,
  requestSend,
  newsletterEnabled,
  assertDelivered,
} from "../scripts/newsletter-send.mjs";

const require = createRequire(import.meta.url);
const nl = require("../functions/packages/newsletter/subscribe/newsletter.js");
const { handle: subscribe } = require("../functions/packages/newsletter/subscribe/index.js");
const { handle: confirm } = require("../functions/packages/newsletter/confirm/index.js");
const { handle: unsubscribe } = require("../functions/packages/newsletter/unsubscribe/index.js");
const { handle: sendAction } = require("../functions/packages/newsletter/send/index.js");

/** A fake database: the SQL the code sends, and the subscribers / claimed posts it holds. */
function fakeDb({ subscribers = [], claimed = [] } = {}) {
  const calls = [];
  const subs = new Map(subscribers.map((s) => [s.email, s]));
  const posts = new Set(claimed);
  const sql = async (text, params = []) => {
    calls.push({ text, params });
    if (text.startsWith("insert into newsletter_subscribers"))
      subs.set(params[0], { email: params[0], locale: params[1], consented_at: params[2] });
    else if (text.startsWith("delete from newsletter_subscribers")) subs.delete(params[0]);
    else if (text.startsWith("select email, locale, consented_at"))
      return [...subs.values()].map((s) => ({
        email: s.email,
        locale: s.locale,
        consented_at: s.consented_at ?? "2026-10-16T00:00:00Z",
      }));
    else if (text.startsWith("insert into newsletter_posts")) {
      if (posts.has(params[0])) return [];
      posts.add(params[0]);
      return [{ slug: params[0] }];
    }
    return [];
  };
  return { sql, calls, subs, posts };
}

const ENV = {
  MAIL_API_KEY: "k",
  MAIL_DOMAIN: "mg.example.com",
  MAIL_FROM: "Krizaka Blog <blog@mg.example.com>",
  MAIL_TOKEN_SECRET: "s3cret",
  MAIL_SEND_TOKEN: "bearer-token",
  DATABASE_URL: "postgres://u:p@db.example.com:25060/krizaka_newsletter",
  ABUSE_CAPTCHA_PROVIDER: "turnstile",
  ABUSE_CAPTCHA_SECRET_KEY: "cs",
};

/** A fake fetch that records calls and answers by URL prefix. */
function fakeFetch(answers = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    const key = Object.keys(answers).find((k) => url.startsWith(k));
    const a = key ? answers[key] : { status: 200, body: {} };
    return { ok: a.status < 400, status: a.status, json: async () => a.body ?? {} };
  };
  fn.calls = calls;
  return fn;
}
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

test("every copy of the newsletter code is identical", () => {
  const read = (a) =>
    readFileSync(new URL(`../functions/packages/newsletter/${a}/newsletter.js`, import.meta.url), "utf8");
  for (const a of ["confirm", "unsubscribe", "send"]) assert.equal(read(a), read("subscribe"), a);
});

test("a confirm token is accepted while fresh, refused when forged, expired or used for another purpose", () => {
  const t = nl.makeToken({ email: "a@b.co", locale: "fr", purpose: "c", now: 1_000 }, "s");
  assert.deepEqual(nl.readToken(t, "c", "s", 2_000), { email: "a@b.co", locale: "fr" });
  assert.equal(nl.readToken(t, "c", "other", 2_000), null);
  assert.equal(nl.readToken(t, "u", "s", 2_000), null);
  assert.equal(nl.readToken(t, "c", "s", 1_000 + nl.CONFIRM_TTL_MS + 1), null);
  assert.equal(nl.readToken(t.slice(0, -2) + "xx", "c", "s", 2_000), null);
  assert.equal(nl.readToken(undefined, "c", "s"), null);
  const u = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "u" }, "s");
  assert.deepEqual(nl.readToken(u, "u", "s", Date.now() + 10 * 365 * 86_400_000), { email: "a@b.co", locale: "en" });
});

test("subscribe: refuses a bad address and a missing or refused CAPTCHA; sends nothing then", async () => {
  const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: false } } });
  assert.equal((await subscribe({ __ow_method: "post", email: "nope" }, ENV, f)).statusCode, 400);
  const r = await subscribe({ __ow_method: "post", email: "a@b.co", captchaToken: "x" }, ENV, f);
  assert.equal(JSON.parse(r.body).error, "captcha");
  assert.ok(!f.calls.some((c) => c.url.includes("/messages")));
});

test("subscribe: without mail or CAPTCHA configured it answers 503 (fails closed)", async () => {
  assert.equal(
    (
      await subscribe(
        { __ow_method: "post", email: "a@b.co" },
        { ...ENV, ABUSE_CAPTCHA_SECRET_KEY: "unset" },
        fakeFetch(),
      )
    ).statusCode,
    503,
  );
  assert.equal(
    (await subscribe({ __ow_method: "post", email: "a@b.co" }, { ...ENV, MAIL_TOKEN_SECRET: "" }, fakeFetch()))
      .statusCode,
    503,
  );
  assert.equal(
    (await subscribe({ __ow_method: "post", email: "a@b.co" }, { ...ENV, DATABASE_URL: "unset" }, fakeFetch()))
      .statusCode,
    503,
  );
});

test("subscribe: the honeypot answers like a success and sends nothing", async () => {
  const f = fakeFetch();
  const r = await subscribe({ __ow_method: "post", email: "a@b.co", website: "spam" }, ENV, f);
  assert.equal(r.statusCode, 202);
  assert.equal(f.calls.length, 0);
});

test("subscribe: a valid request e-mails a confirmation link and stores nothing", async () => {
  const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: true } } });
  const r = await subscribe(
    {
      __ow_method: "post",
      email: " A@B.co ",
      locale: "fr",
      captchaToken: "ok",
      __ow_headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    },
    ENV,
    f,
  );
  assert.equal(r.statusCode, 202);
  assert.match(f.calls[0].init.body, /remoteip=1.2.3.4/);
  const mail = f.calls.find((c) => c.url === "https://api.mailgun.net/v3/mg.example.com/messages");
  assert.ok(mail);
  const body = new URLSearchParams(mail.init.body);
  assert.equal(body.get("to"), "a@b.co");
  assert.match(body.get("subject"), /Confirmez/);
  assert.match(body.get("text"), /https:\/\/blog\.krizaka\.com\/api\/newsletter\/confirm\?t=/);
  assert.equal(body.get("o:tracking"), "no");
  assert.equal(f.calls.length, 2, "the CAPTCHA and the e-mail: nothing stored before the confirmation");
});

test("every e-mail says who sends it, why, where to read what is kept (CASL, Loi 25)", () => {
  const c = nl.confirmationEmail(
    { email: "a@b.co", locale: "en" },
    { ...ENV, MAIL_SENDER_ADDRESS: "1 rue X, Montréal (Québec) H0H 0H0" },
  );
  assert.match(c.text, /Technologies Krizaka Inc\./);
  assert.match(c.text, /1 rue X, Montréal/);
  assert.match(c.text, /subscription form of blog\.krizaka\.com/);
  assert.match(c.text, /blog\.krizaka\.com\/newsletter\//);
  const p = nl.newPostEmail(
    { email: "a@b.co", locale: "fr", consentedAt: "2026-10-16T12:00:00Z" },
    { title: "T", description: "D", url: "https://blog.krizaka.com/fr/posts/t/" },
    ENV,
  );
  assert.match(p.text, /Se désinscrire en un clic : https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=/);
  assert.match(p.text, /le 2026-10-16/);
  assert.match(p.text, /Montréal \(Québec\), Canada/);
  assert.match(p.headers["List-Unsubscribe"], /^<https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=.+>$/);
  assert.equal(p.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.doesNotMatch(p.html, /<img/);
});

test("confirm: a fresh link adds the subscriber with the proof of consent; an old one lands on expired", async () => {
  const now = Date.UTC(2026, 9, 16);
  const t = nl.makeToken({ email: "a@b.co", locale: "fr", purpose: "c", now }, ENV.MAIL_TOKEN_SECRET);
  const db = fakeDb();
  const r = await confirm({ t, l: "fr" }, ENV, db.sql, now + 1000);
  assert.equal(r.statusCode, 303);
  assert.equal(r.headers.Location, "https://blog.krizaka.com/fr/newsletter/confirmed/");
  const [insert] = db.calls;
  assert.match(insert.text, /^insert into newsletter_subscribers .* on conflict \(email\) do update/);
  assert.equal(insert.params[0], "a@b.co");
  assert.equal(insert.params[1], "fr");
  assert.ok(insert.params[2].startsWith("2026-10-16"));
  assert.match(insert.params[3], /double opt-in/);
  const late = fakeDb();
  const r2 = await confirm({ t, l: "fr" }, ENV, late.sql, now + nl.CONFIRM_TTL_MS + 1);
  assert.equal(r2.headers.Location, "https://blog.krizaka.com/fr/newsletter/expired/");
  assert.equal(late.calls.length, 0);
});

test("confirm: an address already on the list, or a link opened twice, lands on confirmed (idempotent, krizaka-blog#192)", async () => {
  const now = Date.UTC(2026, 9, 28);
  const t = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "c", now }, ENV.MAIL_TOKEN_SECRET);
  const db = fakeDb({ subscribers: [{ email: "a@b.co", locale: "fr" }] });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await confirm({ t }, ENV, db.sql, now + 1000)).headers.Location,
      "https://blog.krizaka.com/newsletter/confirmed/",
    );
  assert.equal(db.subs.size, 1);
  assert.equal(db.subs.get("a@b.co").locale, "en", "the renewed consent keeps one row");
});

test("confirm: only a genuine link past its date says expired; a forged one says invalid; a failing list says try again (krizaka-blog#192)", async () => {
  const now = Date.UTC(2026, 9, 28);
  const t = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "c", now }, ENV.MAIL_TOKEN_SECRET);
  const late = (await confirm({ t }, ENV, fakeDb().sql, now + nl.CONFIRM_TTL_MS + 1)).headers.Location;
  assert.equal(late, "https://blog.krizaka.com/newsletter/expired/");
  assert.equal(
    (await confirm({ t: t.slice(0, -2) + "xx" }, ENV, fakeDb().sql, now)).headers.Location,
    "https://blog.krizaka.com/newsletter/link-invalid/",
  );
  assert.equal(
    (await confirm({ t: undefined }, ENV, fakeDb().sql, now)).headers.Location,
    "https://blog.krizaka.com/newsletter/link-invalid/",
  );
  const down = async () => Promise.reject(new Error("db"));
  const failed = await confirm({ t }, ENV, down, now);
  assert.equal(failed.statusCode, 503, "a database error is not an expired link");
  assert.match(failed.body, /still valid/);
  const noDb = await confirm({ t }, { ...ENV, DATABASE_URL: "unset" }, fakeDb().sql, now);
  assert.equal(noDb.statusCode, 503, "a missing configuration is not an expired link");
});

test("send to click: the link of the confirmation e-mail, in its text and in its HTML, confirms the subscriber (krizaka-blog#192)", async () => {
  const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: true } } });
  await subscribe({ __ow_method: "post", email: "a@b.co", locale: "fr", captchaToken: "ok" }, ENV, f);
  const mail = new URLSearchParams(f.calls.find((c) => c.url.includes("/messages")).init.body);
  const fromText = mail.get("text").match(/https:\/\/blog\.krizaka\.com\/api\/newsletter\/confirm\?[^\s]+/)[0];
  const fromHtml = mail
    .get("html")
    .match(/href="(https:\/\/blog\.krizaka\.com\/api\/newsletter\/confirm\?[^"]+)"/)[1]
    .replaceAll("&amp;", "&");
  assert.equal(fromHtml, fromText);
  const url = new URL(fromText);
  const db = fakeDb();
  const r = await confirm({ t: url.searchParams.get("t"), l: url.searchParams.get("l") }, ENV, db.sql);
  assert.equal(r.headers.Location, "https://blog.krizaka.com/fr/newsletter/confirmed/");
  assert.equal(db.subs.size, 1);
});

test("unsubscribe: one click by link (303) or by the mail client (RFC 8058 POST, 200) deletes the row", async () => {
  const t = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "u" }, ENV.MAIL_TOKEN_SECRET);
  const db = fakeDb({ subscribers: [{ email: "a@b.co", locale: "en" }] });
  const r = await unsubscribe({ t }, ENV, db.sql);
  assert.equal(r.headers.Location, "https://blog.krizaka.com/newsletter/unsubscribed/");
  assert.equal(db.subs.size, 0);
  assert.equal(
    (await unsubscribe({ t, __ow_method: "post", "List-Unsubscribe": "One-Click" }, ENV, db.sql)).statusCode,
    200,
    "already gone is fine",
  );
  assert.equal((await unsubscribe({ t: "forged.x", __ow_method: "post" }, ENV, fakeDb().sql)).statusCode, 400);
  const confirmToken = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "c" }, ENV.MAIL_TOKEN_SECRET);
  const wrong = fakeDb();
  await unsubscribe({ t: confirmToken }, ENV, wrong.sql);
  assert.equal(wrong.calls.length, 0, "a confirm link cannot unsubscribe");
});

const versions = { fr: { title: "Titre", description: "D", url: "https://blog.krizaka.com/fr/basics/x/" } };
const auth = { __ow_method: "post", __ow_headers: { authorization: "Bearer bearer-token" } };

test("send: refuses without the bearer, with a bad slug or a URL off the blog", async () => {
  assert.equal(
    (await sendAction({ ...auth, __ow_headers: {}, slug: "x", versions }, ENV, fakeDb().sql)).statusCode,
    401,
  );
  assert.equal(
    (
      await sendAction(
        { ...auth, __ow_headers: { authorization: "Bearer nope" }, slug: "x", versions },
        ENV,
        fakeDb().sql,
      )
    ).statusCode,
    401,
  );
  assert.equal((await sendAction({ ...auth, slug: "../x", versions }, ENV, fakeDb().sql)).statusCode, 400);
  assert.equal(
    (
      await sendAction(
        { ...auth, slug: "x", versions: { en: { title: "T", description: "D", url: "https://evil.example/" } } },
        ENV,
        fakeDb().sql,
      )
    ).statusCode,
    400,
  );
  assert.equal(
    (await sendAction({ ...auth, slug: "x", versions }, { ...ENV, MAIL_SEND_TOKEN: "unset" }, fakeDb().sql)).statusCode,
    401,
  );
});

test("send: one e-mail per subscriber in their language (else the one the post has), and never twice", async () => {
  const db = fakeDb({
    subscribers: [
      { email: "fr@x.co", locale: "fr" },
      { email: "en@x.co", locale: "en" },
      { email: "ko@x.co", locale: "en" },
    ],
  });
  const out = [];
  const send = async (m) => (m.to === "ko@x.co" ? Promise.reject(new Error("mail 500")) : out.push(m));
  const r = await sendAction({ ...auth, slug: "x", versions }, ENV, db.sql, send);
  assert.deepEqual(JSON.parse(r.body), { sent: 2, failed: 1, total: 3 });
  assert.ok(
    out.every((m) => /Titre/.test(m.subject)),
    "the English reader gets the French post: it has no English version",
  );
  assert.match(out.find((m) => m.to === "en@x.co").subject, /^New on the Krizaka blog/);
  assert.ok(db.calls.some((c) => c.text.startsWith("update newsletter_posts set sent")));
  const again = await sendAction({ ...auth, slug: "x", versions }, ENV, db.sql, send);
  assert.deepEqual(JSON.parse(again.body), { already: true });
  assert.equal(out.length, 2, "nothing more was sent");
});

test("the sender script calls the send action with the bearer and reports its answer", async () => {
  const calls = [];
  const f = async (url, init) => (
    calls.push({ url, init }),
    { ok: true, status: 200, json: async () => ({ sent: 1, failed: 0, total: 1 }) }
  );
  const r = await requestSend("x", versions, "tok", f);
  assert.equal(r.sent, 1);
  assert.equal(calls[0].url, "https://blog.krizaka.com/api/newsletter/send");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok");
  const bad = async () => ({ ok: false, status: 401, json: async () => ({ error: "unauthorized" }) });
  await assert.rejects(requestSend("x", versions, "tok", bad), /401 unauthorized/);
});

const post = (draft, title = "T") =>
  `---\ntitle: "${title}"\ndescription: "D"\ndate: 2026-10-16\ndraft: ${draft}\n---\nbody`;

test("a post is sent when it goes from draft to published or arrives published, never for an edit", () => {
  const before = {
    "content/posts/a.en.mdx": post(true),
    "content/posts/b.en.mdx": post(false),
    "content/posts/c.fr.mdx": null,
    "content/posts/d.en.mdx": post(true),
  };
  const after = {
    "content/posts/a.en.mdx": post(false),
    "content/posts/b.en.mdx": post(false, "edited"),
    "content/posts/c.fr.mdx": post(false),
    "content/posts/d.en.mdx": post(true),
  };
  const read = { before: (p) => before[p] ?? null, after: (p) => after[p] ?? null };
  assert.deepEqual(publishedBetween([...Object.keys(after), "lib/x.ts"], read), ["a", "c"]);
});

test("versionsOf reads only the published versions of a post", () => {
  const files = { "content/posts/x.fr.mdx": post(false, "Titre"), "content/posts/x.en.mdx": post(true) };
  const v = versionsOf("x", (p) => files[p] ?? null);
  assert.deepEqual(Object.keys(v), ["fr"]);
  assert.equal(v.fr.url, "https://blog.krizaka.com/fr/basics/x/");
});

test("the pages of the form and of the e-mail links exist in both languages; the landing pages are noindex", () => {
  for (const dir of ["app/(en)/newsletter", "app/fr/newsletter"]) {
    assert.match(readFileSync(new URL(`../${dir}/page.tsx`, import.meta.url), "utf8"), /NewsletterPage/);
    for (const s of ["confirmed", "expired", "unsubscribed"]) {
      const src = readFileSync(new URL(`../${dir}/${s}/page.tsx`, import.meta.url), "utf8");
      assert.match(src, /robots: \{ index: false/);
      assert.match(src, new RegExp(`status="${s}"`));
    }
  }
  for (const s of ["confirmed", "expired", "unsubscribed"])
    assert.ok(nl.pageUrl("fr", `/newsletter/${s}/`).endsWith(`/fr/newsletter/${s}/`));
});

test("the form is on the home and at the end of every post; it posts to the subscribe action", () => {
  assert.match(
    readFileSync(new URL("../app/components/pages/HomePage.tsx", import.meta.url), "utf8"),
    /<NewsletterSection locale=\{locale\} where="home" \/>/,
  );
  assert.match(
    readFileSync(new URL("../app/components/pages/PostPage.tsx", import.meta.url), "utf8"),
    /<NewsletterSection locale=\{locale\} where="post" \/>/,
  );
  assert.match(
    readFileSync(new URL("../app/components/newsletter/SubscribeForm.tsx", import.meta.url), "utf8"),
    /SUBSCRIBE_URL = "\/api\/newsletter\/subscribe"/,
  );
});

test("the app spec and the functions project name every variable the newsletter reads; secrets stay placeholders", () => {
  const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
  const project = readFileSync(new URL("../functions/project.yml", import.meta.url), "utf8");
  for (const k of [
    "MAIL_API_KEY",
    "MAIL_DOMAIN",
    "MAIL_FROM",
    "MAIL_TOKEN_SECRET",
    "MAIL_SEND_TOKEN",
    "MAIL_SENDER_ADDRESS",
    "DATABASE_URL",
    "DATABASE_CA_CERT",
    "ABUSE_CAPTCHA_PROVIDER",
    "ABUSE_CAPTCHA_SECRET_KEY",
  ]) {
    assert.match(spec, new RegExp(`key: ${k}\\b`));
    assert.match(project, new RegExp(`${k}: \\$\\{${k}\\}`));
  }
  for (const k of [
    "MAIL_API_KEY",
    "MAIL_TOKEN_SECRET",
    "MAIL_SEND_TOKEN",
    "DATABASE_URL",
    "DATABASE_CA_CERT",
    "ABUSE_CAPTCHA_SECRET_KEY",
  ])
    assert.match(spec, new RegExp(`key: ${k}, scope: RUN_AND_BUILD_TIME, type: SECRET, value: unset`));
  assert.match(spec, /key: NEXT_PUBLIC_ABUSE_CAPTCHA_SITE_KEY/);
});

test("the newsletter workflow passes its inputs through the environment (no expression inside the script)", () => {
  const wf = readFileSync(new URL("../.github/workflows/newsletter.yml", import.meta.url), "utf8");
  const run = wf.slice(wf.indexOf("run: |"));
  assert.doesNotMatch(run, /\$\{\{/);
  assert.match(wf, /contents: read/);
  assert.match(wf, /MAIL_SEND_TOKEN: \$\{\{ secrets\.MAIL_SEND_TOKEN \}\}/);
  assert.doesNotMatch(wf, /MAIL_API_KEY/, "the Mailgun key stays on the functions");
  assert.match(wf, /fetch-depth: 0/);
});

test("the list's schema: one row per confirmed address with its proof of consent, one row per sent post", () => {
  const sql = readFileSync(new URL("../db/newsletter.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists newsletter_subscribers \(\s+email text primary key/);
  assert.match(sql, /consented_at timestamptz not null/);
  assert.match(sql, /consent_source text not null/);
  assert.match(sql, /create table if not exists newsletter_posts \(\s+slug text primary key/);
});

/* The bug of 2026-10-17: the actions ran on nodejs:default (Node 14, no global fetch) and subscribe crashed (204, no
   body). The newsletter actions pin a runtime with fetch, and main(args, context) never lets a context replace the env. */
test("the newsletter actions run on Node 18 and main() ignores a second argument", async () => {
  const project = readFileSync(new URL("../functions/project.yml", import.meta.url), "utf8");
  const block = project.slice(project.indexOf("- name: newsletter"));
  assert.equal((block.match(/runtime: "nodejs:18"/g) ?? []).length, 4);
  assert.doesNotMatch(block, /nodejs:default/);
  const { main } = require("../functions/packages/newsletter/subscribe/index.js");
  const r = await main({ __ow_method: "get" }, { functionName: "subscribe" });
  assert.equal(r.statusCode, 405);
});

/* The finding of 2026-10-17: the cluster refused new connections (25 in all, most reserved by the services' pools) and
   the warm newsletter actions held three idle ones. A statement opens and closes its own connection; no pool is kept. */
test("the list's connection is opened per statement and closed, never pooled", () => {
  const src = readFileSync(
    new URL("../functions/packages/newsletter/subscribe/newsletter.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(src, /new Pool\(|\bPool\b\s*}/);
  assert.match(src, /await client\.end\(\)/);
});

/* Leaving is the one-click link of every e-mail, nothing else (Oussama, 2026-10-17). */
test("the e-mail's link unsubscribes in one click; a forged one lands on a clear page; RFC 8058 POST works", async () => {
  const t = nl.makeToken({ email: "a@b.co", locale: "fr", purpose: "u" }, ENV.MAIL_TOKEN_SECRET);
  const db = fakeDb({ subscribers: [{ email: "a@b.co", locale: "fr" }] });
  const ok = await unsubscribe({ t, l: "fr" }, ENV, db.sql);
  assert.equal(ok.headers.Location, "https://blog.krizaka.com/fr/newsletter/unsubscribed/");
  assert.equal(db.subs.size, 0);
  assert.equal(
    (await unsubscribe({ t: "forged.token", l: "fr" }, ENV, fakeDb().sql)).headers.Location,
    "https://blog.krizaka.com/fr/newsletter/link-invalid/",
  );
  const confirmToken = nl.makeToken({ email: "a@b.co", locale: "fr", purpose: "c" }, ENV.MAIL_TOKEN_SECRET);
  assert.equal(
    (await unsubscribe({ t: confirmToken }, ENV, fakeDb().sql)).headers.Location,
    "https://blog.krizaka.com/newsletter/link-invalid/",
    "an expired-or-other-purpose token is not an unsubscribe link",
  );
  const viaPost = await unsubscribe(
    { t, __ow_method: "post", "List-Unsubscribe": "One-Click" },
    ENV,
    fakeDb({ subscribers: [{ email: "a@b.co", locale: "fr" }] }).sql,
  );
  assert.equal(viaPost.statusCode, 200);
});

test("no lookup form: no unsubscribe-request action or page; the notice says the e-mails carry the link", () => {
  const { existsSync } = require("node:fs");
  assert.ok(!existsSync(new URL("../functions/packages/newsletter/unsubscribe-request", import.meta.url)));
  assert.ok(!existsSync(new URL("../app/fr/newsletter/unsubscribe", import.meta.url)));
  assert.ok(!existsSync(new URL("../app/(en)/newsletter/unsubscribe", import.meta.url)));
  const form = readFileSync(new URL("../app/components/newsletter/SubscribeForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(form, /\/newsletter\/unsubscribe/);
  assert.match(form, /n\.submitCompact/, "the button's words carry the consent (« M'abonner »)");
  assert.doesNotMatch(form, /<Select|<h2|<h3/, "one line and one row");
  const fr = JSON.parse(readFileSync(new URL("../messages/fr.json", import.meta.url), "utf8")).newsletter;
  assert.match(fr.compactConsent, /Vous pourrez vous désabonner en un clic depuis chaque courriel/);
  for (const dir of ["app/(en)/newsletter", "app/fr/newsletter"]) {
    for (const page of ["unsubscribed", "link-invalid"])
      assert.match(
        readFileSync(new URL(`../${dir}/${page}/page.tsx`, import.meta.url), "utf8"),
        /robots: \{ index: false/,
      );
  }
  const pages = readFileSync(new URL("../app/components/newsletter/NewsletterPages.tsx", import.meta.url), "utf8");
  assert.match(pages, /n\.resubscribeButton/, "« Me réabonner » on the unsubscribed page, a plain link");
  assert.match(
    readFileSync(new URL("../app/components/newsletter/CaptchaWidget.tsx", import.meta.url), "utf8"),
    /appearance: "interaction-only"/,
  );
});

/* The CAPTCHA is not part of the page load: Cloudflare's script (and the challenge frame, ~150 KB) is fetched when the form is
   on screen or takes focus (Lighthouse mobile: the eager script cost the home and post pages points of performance). */
import { whenWanted } from "../lib/when-wanted.ts";

function fakeForm() {
  const handlers = new Map();
  return {
    addEventListener: (t, h) => handlers.set(t, h),
    removeEventListener: (t) => handlers.delete(t),
    fire: (t) => handlers.get(t)?.(),
    handlers,
  };
}
function withObserver(fn) {
  const real = globalThis.IntersectionObserver;
  const made = [];
  globalThis.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
      this.disconnected = false;
      made.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  try {
    return fn(made);
  } finally {
    globalThis.IntersectionObserver = real;
  }
}

test("nothing is requested until the form is seen or focused", () =>
  withObserver((made) => {
    const form = fakeForm();
    let calls = 0;
    whenWanted(form, () => calls++);
    assert.equal(calls, 0);
    made[0].cb([{ isIntersecting: false }]);
    assert.equal(calls, 0);
    made[0].cb([{ isIntersecting: true }]);
    assert.equal(calls, 1);
    assert.equal(made[0].disconnected, true);
    assert.equal(form.handlers.size, 0);
  }));

test("focusing the form is enough, and it fires once", () =>
  withObserver((made) => {
    const form = fakeForm();
    let calls = 0;
    whenWanted(form, () => calls++);
    form.fire("focusin");
    made[0].cb([{ isIntersecting: true }]);
    assert.equal(calls, 1);
  }));

test("without IntersectionObserver the focus still loads it; the cleanup cancels a pending load", () => {
  const real = globalThis.IntersectionObserver;
  delete globalThis.IntersectionObserver;
  try {
    const form = fakeForm();
    let calls = 0;
    whenWanted(form, () => calls++)();
    form.fire("focusin");
    assert.equal(calls, 0);
  } finally {
    globalThis.IntersectionObserver = real;
  }
});

test("the widget only loads Cloudflare's script from the wait, never straight from the effect", () => {
  const src = readFileSync(new URL("../app/components/newsletter/CaptchaWidget.tsx", import.meta.url), "utf8");
  assert.match(src, /whenWanted\(/);
  const effect = src.slice(src.indexOf("useEffect("));
  const calls = [...effect.matchAll(/loadScript\(\)/g)];
  assert.equal(calls.length, 1);
  assert.ok(
    effect.indexOf("loadScript()") < effect.indexOf("whenWanted("),
    "loadScript() is inside start, defined before the wait",
  );
  assert.match(effect.slice(effect.indexOf("const start")), /^const start = \(\) => \{\s*loadScript\(\)/);
  assert.doesNotMatch(src, /<script[^>]*challenges\.cloudflare/);
});

test("the send switch is off unless MAIL_NEWSLETTER_ENABLED is exactly true (fail closed)", () => {
  assert.equal(newsletterEnabled({}), false);
  assert.equal(newsletterEnabled({ MAIL_NEWSLETTER_ENABLED: "" }), false);
  assert.equal(newsletterEnabled({ MAIL_NEWSLETTER_ENABLED: "false" }), false);
  assert.equal(newsletterEnabled({ MAIL_NEWSLETTER_ENABLED: "1" }), false);
  assert.equal(newsletterEnabled({ MAIL_NEWSLETTER_ENABLED: "true" }), true);
  assert.match(
    readFileSync(new URL("../.github/workflows/newsletter.yml", import.meta.url), "utf8"),
    /MAIL_NEWSLETTER_ENABLED: \$\{\{ vars\.MAIL_NEWSLETTER_ENABLED \}\}/,
    "the workflow passes the variable",
  );
});

test("a send the provider rejected fails the run loudly; a complete one and an already-sent one do not", () => {
  assert.throws(() => assertDelivered("x", { sent: 0, failed: 1, total: 1 }), /reached 0 of 1/);
  assert.throws(() => assertDelivered("x", { sent: 2, failed: 1, total: 3 }), /1 failed/);
  assert.match(assertDelivered("x", { sent: 1, failed: 0, total: 1 }), /sent to 1 of 1/);
  assert.match(assertDelivered("x", { already: true }), /already sent/);
});

test("the subscribe action checks the CAPTCHA with @krizaka/rate-limit/turnstile, bundled and in sync", async () => {
  const { render, TARGET, EMAILS, renderEmails } = await import("../scripts/bundle-functions.mjs");
  assert.equal(readFileSync(TARGET, "utf8"), render(), "run `npm run functions:bundle`");
  assert.equal(readFileSync(EMAILS, "utf8"), await renderEmails(), "run `npm run functions:bundle`");
  // No second copy of the siteverify call in the functions.
  for (const a of ["subscribe", "confirm", "unsubscribe", "send"]) {
    assert.doesNotMatch(
      readFileSync(new URL(`../functions/packages/newsletter/${a}/newsletter.js`, import.meta.url), "utf8"),
      /siteverify/,
    );
  }
  // A token the library saw once is refused the second time (replay), and the answer is the same « captcha ».
  const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: true } } });
  const args = { __ow_method: "post", email: "a@b.co", captchaToken: "once" };
  assert.equal((await subscribe(args, ENV, f)).statusCode, 202);
  assert.equal(JSON.parse((await subscribe(args, ENV, f)).body).error, "captcha");
});

test("the confirmation e-mail is the designed one of @krizaka/email, EN and FR, with the signed link that confirms", async () => {
  for (const locale of ["en", "fr"]) {
    const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: true } } });
    const r = await subscribe(
      { __ow_method: "post", email: "a@b.co", locale, captchaToken: `designed-${locale}` },
      ENV,
      f,
    );
    assert.equal(r.statusCode, 202);
    const body = new URLSearchParams(
      f.calls.find((c) => c.url === "https://api.mailgun.net/v3/mg.example.com/messages").init.body,
    );
    const [text, html] = [body.get("text"), body.get("html")];
    assert.match(html, /<table/, "the e-mail kit's layout: tables and inline styles");
    assert.match(body.get("subject"), locale === "fr" ? /Confirmez/ : /Confirm/);
    assert.doesNotMatch(text + html, /__CONFIRM_TOKEN__|__SENDER_ADDRESS__/, "every placeholder is filled");
    const link = /https:\/\/blog\.krizaka\.com\/api\/newsletter\/confirm\?t=[^\s"<&]+/.exec(text)?.[0];
    assert.ok(link, "the plain-text part carries the link");
    assert.equal(/&l=fr/.test(text), locale === "fr");
    const db = fakeDb();
    const t = decodeURIComponent(new URL(link).searchParams.get("t"));
    const clicked = await confirm({ t, l: locale }, ENV, db.sql);
    assert.equal(clicked.statusCode, 303);
    assert.match(clicked.headers.Location, /\/newsletter\/confirmed\//);
    assert.ok(db.subs.has("a@b.co"));
  }
});
