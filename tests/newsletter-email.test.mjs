import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  coverOf,
  imagesOf,
  renderPostEmail,
  withRenderedEmails,
  UNSUBSCRIBE_TOKEN,
  SENDER_ADDRESS,
} from "../scripts/newsletter-email.mjs";
import { versionsOf, requestSend } from "../scripts/newsletter-send.mjs";

const require = createRequire(import.meta.url);
const nl = require("../functions/packages/newsletter/send/newsletter.js");
const { handle: sendAction } = require("../functions/packages/newsletter/send/index.js");
const media = JSON.parse(readFileSync(new URL("../lib/media.json", import.meta.url), "utf8"));

const ENV = {
  MAIL_API_KEY: "k",
  MAIL_DOMAIN: "d.example",
  MAIL_FROM: "Blog <b@d.example>",
  MAIL_TOKEN_SECRET: "s".repeat(32),
  MAIL_SEND_TOKEN: "bearer-token",
  MAIL_SENDER_ADDRESS: "1 Example Street, Montréal (Québec) H0H 0H0",
  DATABASE_URL: "postgres://x",
};
const auth = { __ow_method: "post", __ow_headers: { authorization: "Bearer bearer-token" } };
const cover = coverOf(media, "accounts-keys");
const VERSIONS = {
  fr: {
    title: "Un billet « d'essai »",
    description: "Deux ou trois lignes qui disent de quoi parle le billet, sans rien promettre de plus.",
    url: "https://blog.krizaka.com/fr/posts/essai/",
    coverUrl: cover,
    coverAlt: "Un trousseau de clés sur un bureau",
  },
  en: {
    title: "A test post, and <b>",
    description: "Two or three lines that say what the post is about, nothing more.",
    url: "https://blog.krizaka.com/posts/essai/",
    coverUrl: cover,
    coverAlt: "A key ring on a desk",
  },
};

function fakeDb() {
  const calls = [];
  const sql = async (text, params = []) => {
    calls.push(text);
    if (text.startsWith("select email, locale, consented_at"))
      return [
        { email: "fr@x.co", locale: "fr", consented_at: "2026-10-16T00:00:00Z" },
        { email: "en@x.co", locale: "en", consented_at: "2026-10-16T00:00:00Z" },
      ];
    if (text.startsWith("insert into newsletter_posts"))
      return fakeDb.claimed.has(params[0]) ? [] : (fakeDb.claimed.add(params[0]), [{ slug: params[0] }]);
    return [];
  };
  return { sql, calls };
}
fakeDb.claimed = new Set();

test("the placeholders of the script and of the function are the same strings", () => {
  assert.equal(UNSUBSCRIBE_TOKEN, nl.UNSUBSCRIBE_TOKEN);
  assert.equal(SENDER_ADDRESS, nl.SENDER_ADDRESS);
});

test("the e-mail renders in both languages: the title, the cover, one button to the post, the excerpt, the footer", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  assert.deepEqual(Object.keys(rendered).sort(), ["en", "fr"]);
  const fr = rendered.fr;
  const en = rendered.en;
  assert.match(fr.subject, /^Nouveau sur le blogue Krizaka/);
  assert.match(en.subject, /^New on the Krizaka blog/);
  for (const [l, mail] of [
    ["fr", fr],
    ["en", en],
  ]) {
    const v = VERSIONS[l];
    assert.ok(mail.html.includes(`href="${v.url}"`), `${l}: the button leads to the post`);
    assert.ok(mail.html.includes(v.coverUrl), `${l}: the cover is shown`);
    assert.ok(mail.html.includes(`alt="${v.coverAlt}"`), `${l}: the cover has its alt`);
    assert.ok(mail.html.includes(v.description), `${l}: the excerpt`);
    assert.ok(
      mail.html.includes(`<html lang="${l}"`) || new RegExp(`lang="${l}"`).test(mail.html),
      `${l}: the language of the document`,
    );
    assert.match(mail.html, /prefers-color-scheme:\s*dark/, `${l}: dark mode`);
    assert.match(mail.html, /<table/, `${l}: built on tables`);
    assert.ok(mail.html.includes(UNSUBSCRIBE_TOKEN), `${l}: the unsubscribe link is there`);
    assert.ok(mail.html.includes(SENDER_ADDRESS), `${l}: the sender's address stands in the footer`);
    assert.ok(mail.html.includes(`${l === "fr" ? "/fr" : ""}/newsletter/`), `${l}: the note on what is kept`);
    assert.doesNotMatch(mail.html, /<script|javascript:|<form/i);
    assert.doesNotMatch(mail.html, /width="1"\s+height="1"|tracking/i, `${l}: no tracking pixel`);
  }
  assert.ok(en.html.includes("&lt;b&gt;") && !en.html.includes("<b>"), "a title is escaped");
});

test("the plain-text part carries the title, the link, the unsubscribe link and the sender, and no markup", async () => {
  for (const l of ["fr", "en"]) {
    const { text } = await renderPostEmail(l, VERSIONS[l]);
    assert.ok(text.includes(VERSIONS[l].url));
    assert.ok(text.includes(UNSUBSCRIBE_TOKEN));
    assert.ok(text.includes(SENDER_ADDRESS));
    assert.ok(text.toLowerCase().includes(VERSIONS[l].title.toLowerCase().slice(0, 8)));
    assert.doesNotMatch(text, /<(a|p|div|span|table|td|tr|img|br|html|body)\b[^>]*>/i);
  }
});

test("a post without a cover still renders (no image of the post, the mark only)", async () => {
  const { html } = await renderPostEmail("en", { ...VERSIONS.en, coverUrl: undefined });
  assert.ok(!html.includes("b-cdn.net/site/blog/"));
  assert.ok(html.includes(VERSIONS.en.url));
});

test("no broken image: every image of the e-mail answers 200 with an image type", async () => {
  const { html } = await renderPostEmail("fr", VERSIONS.fr);
  const images = [...new Set(imagesOf(html))];
  assert.ok(images.length >= 2, "the mark (light and dark) and the cover");
  assert.ok(images.includes(cover));
  for (const src of images) {
    assert.match(src, /^https:\/\//, src);
    const res = await fetch(src, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    assert.equal(res.status, 200, `${src} answered ${res.status}`);
    assert.match(res.headers.get("content-type") ?? "", /^image\//, src);
  }
});

test("the function gives each reader their own unsubscribe link and the postal address; nothing is left to fill", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const mail = nl.newPostEmail({ email: "reader@x.co", locale: "fr", consentedAt: null }, rendered.fr, ENV);
  assert.equal(mail.to, "reader@x.co");
  const link = mail.html.match(/https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=([^"&]+)&amp;l=fr/);
  assert.ok(link, "the unsubscribe link of the HTML");
  assert.deepEqual(
    nl.readToken(decodeURIComponent(link[1]), "u", ENV.MAIL_TOKEN_SECRET),
    { email: "reader@x.co", locale: "fr" },
    "a signed link that unsubscribes this reader and no other",
  );
  assert.ok(mail.text.includes(`unsubscribe?t=${link[1]}`), "the same link in the plain-text part");
  assert.ok(mail.html.includes("1 Example Street") && mail.text.includes("1 Example Street"));
  for (const part of [mail.html, mail.text, mail.subject])
    assert.ok(!part.includes(UNSUBSCRIBE_TOKEN) && !part.includes(SENDER_ADDRESS), "no placeholder left");
  assert.match(
    mail.headers["List-Unsubscribe"],
    /^<https:\/\/blog\.krizaka\.com\/api\/newsletter\/unsubscribe\?t=.+>$/,
  );
  assert.equal(mail.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  const other = nl.newPostEmail({ email: "other@x.co", locale: "fr", consentedAt: null }, rendered.fr, ENV);
  assert.notEqual(other.html, mail.html, "each reader has their own link");
});

test("the postal address is escaped in the HTML, and the post is not rendered with unset sender: the default stands", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const risky = nl.newPostEmail({ email: "r@x.co", locale: "en", consentedAt: null }, rendered.en, {
    ...ENV,
    MAIL_SENDER_ADDRESS: "A & B <c>, Montréal",
  });
  assert.ok(risky.html.includes("A &amp; B &lt;c&gt;, Montréal"));
  assert.ok(risky.text.includes("A & B <c>, Montréal"));
  const unset = nl.newPostEmail({ email: "r@x.co", locale: "en", consentedAt: null }, rendered.en, {
    ...ENV,
    MAIL_SENDER_ADDRESS: "unset",
  });
  assert.ok(unset.html.includes("Montréal (Québec), Canada"));
});

test("send: the designed e-mail goes to each subscriber in their language, once; a second call sends nothing", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const db = fakeDb();
  const out = [];
  const send = async (m) => out.push(m);
  const r = await sendAction({ ...auth, slug: "essai", versions: rendered }, ENV, db.sql, send);
  assert.deepEqual(JSON.parse(r.body), { sent: 2, failed: 0, total: 2 });
  assert.match(out.find((m) => m.to === "fr@x.co").subject, /^Nouveau sur le blogue/);
  assert.match(out.find((m) => m.to === "en@x.co").subject, /^New on the Krizaka blog/);
  assert.ok(out.every((m) => m.html.includes("<table") && m.headers["List-Unsubscribe-Post"]));
  const again = await sendAction({ ...auth, slug: "essai", versions: rendered }, ENV, db.sql, send);
  assert.deepEqual(JSON.parse(again.body), { already: true });
  assert.equal(out.length, 2, "not duplicated");
});

test("send: a rendered version needs both html and text, within bounds", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const only = (v) => ({ ...auth, slug: "essai", versions: { fr: { ...rendered.fr, ...v } } });
  assert.equal((await sendAction(only({ text: undefined }), ENV, fakeDb().sql, async () => {})).statusCode, 400);
  assert.equal(
    (await sendAction(only({ html: "x".repeat(200001) }), ENV, fakeDb().sql, async () => {})).statusCode,
    400,
  );
});

test("test mode: one e-mail to the given address only, « [Test] » in the subject, the list never read and the post never claimed", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const db = fakeDb();
  const out = [];
  const r = await sendAction(
    { ...auth, slug: "jamais-envoye", versions: rendered, test: "Me@Example.com", locale: "en" },
    ENV,
    db.sql,
    async (m) => out.push(m),
  );
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { test: true, sent: 1, to: "me@example.com", locale: "en" });
  assert.equal(out.length, 1);
  assert.equal(out[0].to, "me@example.com");
  assert.match(out[0].subject, /^\[Test\] New on the Krizaka blog/);
  assert.deepEqual(db.calls, [], "no database access: the list is untouched");
  assert.ok(!fakeDb.claimed.has("jamais-envoye"), "the post is not claimed: the real send still happens once");
  const ok = await sendAction({ ...auth, slug: "jamais-envoye", versions: rendered }, ENV, db.sql, async (m) =>
    out.push(m),
  );
  assert.equal(JSON.parse(ok.body).total, 2, "the real send is unaffected by the test");
});

test("test mode: bearer required, valid address required, a mail failure is reported", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const noop = async () => {};
  assert.equal(
    (
      await sendAction(
        { ...auth, __ow_headers: {}, slug: "x", versions: rendered, test: "me@example.com" },
        ENV,
        fakeDb().sql,
        noop,
      )
    ).statusCode,
    401,
  );
  assert.equal(
    (await sendAction({ ...auth, slug: "x", versions: rendered, test: "not an address" }, ENV, fakeDb().sql, noop))
      .statusCode,
    400,
  );
  assert.equal(
    (
      await sendAction(
        { ...auth, slug: "x", versions: rendered, test: "me@example.com" },
        ENV,
        fakeDb().sql,
        async () => Promise.reject(new Error("mail 500")),
      )
    ).statusCode,
    502,
  );
});

test("the sender script passes the test address and the rendered e-mails to the action", async () => {
  const rendered = await withRenderedEmails(VERSIONS);
  const calls = [];
  const f = async (url, init) => (
    calls.push({ url, init }),
    { ok: true, status: 200, text: async () => JSON.stringify({ test: true, sent: 1 }) }
  );
  await requestSend("essai", rendered, "tok", f, { test: "me@example.com", locale: "fr" });
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.test, "me@example.com");
  assert.ok(body.versions.fr.html.length > 1000 && body.versions.fr.text.length > 100);
});

test("versionsOf gives a post's cover as the e-mail-sized WebP of the media library, and none when the post has no cover", () => {
  const files = {
    "content/posts/a.en.mdx": `---\ntitle: A\ndescription: D\ndate: 2026-10-20\ncover: accounts-keys\ncoverAlt: Keys\ndraft: false\n---\nx`,
    "content/posts/a.fr.mdx": `---\ntitle: A\ndescription: D\ndate: 2026-10-20\ndraft: false\n---\nx`,
  };
  const v = versionsOf("a", (p) => files[p] ?? null, media);
  assert.equal(v.en.coverUrl, cover);
  assert.equal(v.en.coverAlt, "Keys");
  assert.equal(v.fr.coverUrl, undefined);
  assert.match(cover, /r1200\.[0-9a-f]{10}\.webp$/);
  assert.equal(coverOf(media, "no-such-id"), undefined);
});

test("the workflow runs the sender after npm ci, with the bearer only, and a draft never triggers it", () => {
  const wf = readFileSync(new URL("../.github/workflows/newsletter.yml", import.meta.url), "utf8");
  assert.match(wf, /npm ci/);
  assert.match(wf, /MAIL_SEND_TOKEN: \$\{\{ secrets\.MAIL_SEND_TOKEN \}\}/);
  assert.match(
    readFileSync(new URL("../scripts/newsletter-send.mjs", import.meta.url), "utf8"),
    /isPublished\(read\.after\(path\)\) && !isPublished\(read\.before\(path\)\)/,
  );
});

test("a long cover description (the alt of a cover can be a sentence) is cut to what the template accepts, not refused", async () => {
  const { html } = await renderPostEmail("fr", {
    ...VERSIONS.fr,
    coverAlt: "Un bureau en noyer à l'aube. ".repeat(30),
  });
  assert.ok(html.includes("<img"));
  assert.ok(html.includes('…"'), "cut with an ellipsis");
});
