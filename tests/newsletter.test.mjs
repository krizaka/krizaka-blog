import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { publishedBetween, versionsOf, versionFor, claim, sendPost } from "../scripts/newsletter-send.mjs";

const require = createRequire(import.meta.url);
const nl = require("../functions/packages/newsletter/subscribe/newsletter.js");
const { main: subscribe } = require("../functions/packages/newsletter/subscribe/index.js");
const { main: confirm } = require("../functions/packages/newsletter/confirm/index.js");
const { main: unsubscribe } = require("../functions/packages/newsletter/unsubscribe/index.js");

const ENV = {
  MAIL_API_KEY: "k",
  MAIL_DOMAIN: "mg.example.com",
  MAIL_FROM: "Krizaka Blog <blog@mg.example.com>",
  MAIL_NEWSLETTER_LIST: "blog@mg.example.com",
  MAIL_TOKEN_SECRET: "s3cret",
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

test("the three copies of the newsletter code are identical", () => {
  const read = (a) => readFileSync(new URL(`../functions/packages/newsletter/${a}/newsletter.js`, import.meta.url), "utf8");
  assert.equal(read("confirm"), read("subscribe"));
  assert.equal(read("unsubscribe"), read("subscribe"));
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
  assert.equal((await subscribe({ __ow_method: "post", email: "a@b.co" }, { ...ENV, ABUSE_CAPTCHA_SECRET_KEY: "unset" }, fakeFetch())).statusCode, 503);
  assert.equal((await subscribe({ __ow_method: "post", email: "a@b.co" }, { ...ENV, MAIL_TOKEN_SECRET: "" }, fakeFetch())).statusCode, 503);
});

test("subscribe: the honeypot answers like a success and sends nothing", async () => {
  const f = fakeFetch();
  const r = await subscribe({ __ow_method: "post", email: "a@b.co", website: "spam" }, ENV, f);
  assert.equal(r.statusCode, 202);
  assert.equal(f.calls.length, 0);
});

test("subscribe: a valid request e-mails a confirmation link and stores nothing", async () => {
  const f = fakeFetch({ [SITEVERIFY]: { status: 200, body: { success: true } } });
  const r = await subscribe({ __ow_method: "post", email: " A@B.co ", locale: "fr", captchaToken: "ok", __ow_headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } }, ENV, f);
  assert.equal(r.statusCode, 202);
  assert.match(f.calls[0].init.body, /remoteip=1.2.3.4/);
  const mail = f.calls.find((c) => c.url === "https://api.mailgun.net/v3/mg.example.com/messages");
  assert.ok(mail);
  const body = new URLSearchParams(mail.init.body);
  assert.equal(body.get("to"), "a@b.co");
  assert.match(body.get("subject"), /Confirmez/);
  assert.match(body.get("text"), /https:\/\/blog\.krizaka\.com\/api\/newsletter\/confirm\?t=/);
  assert.equal(body.get("o:tracking"), "no");
  assert.ok(!f.calls.some((c) => c.url.includes("/lists/")), "nothing stored before the confirmation");
});

test("every e-mail says who sends it, why, where to read what is kept (CASL, Loi 25)", () => {
  const c = nl.confirmationEmail({ email: "a@b.co", locale: "en" }, { ...ENV, MAIL_SENDER_ADDRESS: "1 rue X, Montréal (Québec) H0H 0H0" });
  assert.match(c.text, /Technologies Krizaka Inc\./);
  assert.match(c.text, /1 rue X, Montréal/);
  assert.match(c.text, /subscription form of blog\.krizaka\.com/);
  assert.match(c.text, /blog\.krizaka\.com\/newsletter\//);
  const p = nl.newPostEmail({ email: "a@b.co", locale: "fr", consentedAt: "2026-10-16T12:00:00Z" }, { title: "T", description: "D", url: "https://blog.krizaka.com/fr/posts/t/" }, ENV);
  assert.match(p.text, /Se désinscrire en un clic : https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=/);
  assert.match(p.text, /le 2026-10-16/);
  assert.match(p.text, /Montréal \(Québec\), Canada/);
  assert.match(p.headers["List-Unsubscribe"], /^<https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=.+>$/);
  assert.equal(p.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.doesNotMatch(p.html, /<img/);
});

test("confirm: a fresh link adds the member with the proof of consent; an old one lands on expired", async () => {
  const now = Date.UTC(2026, 9, 16);
  const t = nl.makeToken({ email: "a@b.co", locale: "fr", purpose: "c", now }, ENV.MAIL_TOKEN_SECRET);
  const f = fakeFetch();
  const r = await confirm({ t }, ENV, f, now + 1000);
  assert.equal(r.statusCode, 303);
  assert.equal(r.headers.Location, "https://blog.krizaka.com/fr/newsletter/confirmed/");
  const add = new URLSearchParams(f.calls[0].init.body);
  assert.equal(f.calls[0].url, "https://api.mailgun.net/v3/lists/blog@mg.example.com/members");
  assert.equal(add.get("address"), "a@b.co");
  assert.equal(add.get("upsert"), "yes");
  const vars = JSON.parse(add.get("vars"));
  assert.equal(vars.locale, "fr");
  assert.match(vars.source, /double opt-in/);
  assert.ok(vars.consentedAt.startsWith("2026-10-16"));
  const late = await confirm({ t, l: "fr" }, ENV, fakeFetch(), now + nl.CONFIRM_TTL_MS + 1);
  assert.equal(late.headers.Location, "https://blog.krizaka.com/fr/newsletter/expired/");
});

test("unsubscribe: one click by link (303) or by the mail client (RFC 8058 POST, 200) removes the member", async () => {
  const t = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "u" }, ENV.MAIL_TOKEN_SECRET);
  const f = fakeFetch();
  const r = await unsubscribe({ t }, ENV, f);
  assert.equal(r.headers.Location, "https://blog.krizaka.com/newsletter/unsubscribed/");
  assert.equal(f.calls[0].init.method, "DELETE");
  assert.equal(f.calls[0].url, "https://api.mailgun.net/v3/lists/blog@mg.example.com/members/a%40b.co");
  const gone = fakeFetch({ "https://api.mailgun.net/v3/lists/": { status: 404 } });
  assert.equal((await unsubscribe({ t, __ow_method: "post", "List-Unsubscribe": "One-Click" }, ENV, gone)).statusCode, 200, "already gone is fine");
  assert.equal((await unsubscribe({ t: "forged.x", __ow_method: "post" }, ENV, fakeFetch())).statusCode, 400);
  const confirmToken = nl.makeToken({ email: "a@b.co", locale: "en", purpose: "c" }, ENV.MAIL_TOKEN_SECRET);
  const wrong = fakeFetch();
  await unsubscribe({ t: confirmToken }, ENV, wrong);
  assert.equal(wrong.calls.length, 0, "a confirm link cannot unsubscribe");
});

const post = (draft, title = "T") => `---\ntitle: "${title}"\ndescription: "D"\ndate: 2026-10-16\ndraft: ${draft}\n---\nbody`;

test("a post is sent when it goes from draft to published or arrives published, never for an edit", () => {
  const before = { "content/posts/a.en.mdx": post(true), "content/posts/b.en.mdx": post(false), "content/posts/c.fr.mdx": null, "content/posts/d.en.mdx": post(true) };
  const after = { "content/posts/a.en.mdx": post(false), "content/posts/b.en.mdx": post(false, "edited"), "content/posts/c.fr.mdx": post(false), "content/posts/d.en.mdx": post(true) };
  const read = { before: (p) => before[p] ?? null, after: (p) => after[p] ?? null };
  assert.deepEqual(publishedBetween([...Object.keys(after), "lib/x.ts"], read), ["a", "c"]);
});

test("a subscriber gets the post in their language, else in the one it has", () => {
  const files = { "content/posts/x.fr.mdx": post(false, "Titre"), "content/posts/x.en.mdx": post(true) };
  const v = versionsOf("x", (p) => files[p] ?? null);
  assert.deepEqual(Object.keys(v), ["fr"]);
  assert.equal(v.fr.url, "https://blog.krizaka.com/fr/posts/x/");
  assert.equal(versionFor(v, "en").title, "Titre");
});

test("never twice: the tag on origin is the lock", () => {
  const ran = [];
  const ok = (...a) => (ran.push(a.join(" ")), "");
  assert.equal(claim("x", ok), true);
  assert.ok(ran.includes("push origin refs/tags/newsletter/x"));
  const exists = (...a) => {
    if (a[0] === "push") throw Object.assign(new Error("rejected"), { stderr: "! [rejected] (already exists)" });
    if (a[0] === "ls-remote") return "abc\trefs/tags/newsletter/x\n";
    return "";
  };
  assert.equal(claim("x", exists), false);
  const offline = (...a) => {
    if (a[0] === "push") throw new Error("network");
    return "";
  };
  assert.throws(() => claim("x", offline), /network/);
});

test("sendPost sends one e-mail per subscriber and reports who was not reached, masked", async () => {
  const sent = [];
  const logs = [];
  const versions = { en: { title: "T", description: "D", url: "https://blog.krizaka.com/posts/t/" } };
  const members = [{ email: "one@x.co", locale: "en" }, { email: "two@x.co", locale: "fr" }];
  const r = await sendPost("t", versions, ENV, { members, log: (l) => logs.push(l), send: async (m) => (m.to === "two@x.co" ? Promise.reject(new Error("mail 500")) : sent.push(m)) });
  assert.equal(r.sent, 1);
  assert.equal(sent[0].to, "one@x.co");
  assert.match(logs[0], /t…@x\.co: mail 500/);
  assert.doesNotMatch(logs[0], /two@x\.co/);
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
  for (const s of ["confirmed", "expired", "unsubscribed"]) assert.ok(nl.pageUrl("fr", `/newsletter/${s}/`).endsWith(`/fr/newsletter/${s}/`));
});

test("the form is on the home and at the end of every post; it posts to the subscribe action", () => {
  assert.match(readFileSync(new URL("../app/components/pages/HomePage.tsx", import.meta.url), "utf8"), /<NewsletterSection locale=\{locale\} where="home" \/>/);
  assert.match(readFileSync(new URL("../app/components/pages/PostPage.tsx", import.meta.url), "utf8"), /<NewsletterSection locale=\{locale\} where="post" \/>/);
  assert.match(readFileSync(new URL("../app/components/newsletter/SubscribeForm.tsx", import.meta.url), "utf8"), /SUBSCRIBE_URL = "\/api\/newsletter\/subscribe"/);
});

test("the app spec and the functions project name every variable the newsletter reads; secrets stay placeholders", () => {
  const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
  const project = readFileSync(new URL("../functions/project.yml", import.meta.url), "utf8");
  for (const k of ["MAIL_API_KEY", "MAIL_DOMAIN", "MAIL_FROM", "MAIL_NEWSLETTER_LIST", "MAIL_TOKEN_SECRET", "MAIL_SENDER_ADDRESS", "ABUSE_CAPTCHA_PROVIDER", "ABUSE_CAPTCHA_SECRET_KEY"]) {
    assert.match(spec, new RegExp(`key: ${k}\\b`));
    assert.match(project, new RegExp(`${k}: \\$\\{${k}\\}`));
  }
  for (const k of ["MAIL_API_KEY", "MAIL_TOKEN_SECRET", "ABUSE_CAPTCHA_SECRET_KEY"]) assert.match(spec, new RegExp(`key: ${k}, scope: RUN_AND_BUILD_TIME, type: SECRET, value: unset`));
  assert.match(spec, /key: NEXT_PUBLIC_ABUSE_CAPTCHA_SITE_KEY/);
});

test("the newsletter workflow passes its inputs through the environment (no expression inside the script)", () => {
  const wf = readFileSync(new URL("../.github/workflows/newsletter.yml", import.meta.url), "utf8");
  const run = wf.slice(wf.indexOf("run: |"));
  assert.doesNotMatch(run, /\$\{\{/);
  assert.match(wf, /contents: write/);
  assert.match(wf, /fetch-depth: 0/);
});
