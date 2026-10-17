/* The blog's newsletter, as small functions shared by the three actions (subscribe, confirm, unsubscribe) and by the
   new-post sender (scripts/newsletter-send.mjs). Copied next to each action, identical (tests/newsletter.test.mjs).

   Double opt-in, with nothing stored before the confirmation: the form sends a signed, expiring token by e-mail; only
   the click on it writes the address to the mailing list (Mailgun list, MAIL_NEWSLETTER_LIST), with the language and
   the date and source of the consent (CASL keeps the proof of consent). Unsubscribing removes the address from the
   list: nothing is kept about someone who left (Loi 25: keep only what is needed).

   Environment (bounded contexts, set on the functions component of .do/app.yaml, secrets never in the repository):
   MAIL_API_KEY, MAIL_DOMAIN, MAIL_API_URL (default https://api.mailgun.net), MAIL_FROM, MAIL_NEWSLETTER_LIST,
   MAIL_TOKEN_SECRET (signs the links), MAIL_SENDER_ADDRESS (the postal address in every e-mail),
   ABUSE_CAPTCHA_PROVIDER=turnstile + ABUSE_CAPTCHA_SECRET_KEY. */
const crypto = require("node:crypto");

const SITE = "https://blog.krizaka.com";
const LOCALES = ["en", "fr"];
/** How long a confirmation link stays valid. A protocol choice (the link is in an e-mail), not a business rule. */
// @fixed: the lifetime of a link sent by e-mail, part of the double opt-in protocol
const CONFIRM_TTL_MS = 48 * 3600 * 1000;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

/** A value is configured when it is set and is not the `unset` placeholder of the app spec. */
const configured = (v) => typeof v === "string" && v.trim() !== "" && v !== "unset";
const normalizeEmail = (v) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const validEmail = (v) => v.length <= 254 && EMAIL.test(v);
const pickLocale = (v) => (LOCALES.includes(v) ? v : "en");

const b64 = (s) => Buffer.from(s).toString("base64url");
const mac = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

/** A signed token: `c` (confirm, expires) or `u` (unsubscribe, never expires — CASL: the link must work for 60 days at least). */
function makeToken({ email, locale, purpose, now = Date.now() }, secret) {
  const body = { e: email, l: locale, p: purpose };
  if (purpose === "c") body.x = now + CONFIRM_TTL_MS;
  const payload = b64(JSON.stringify(body));
  return `${payload}.${mac(payload, secret)}`;
}

/** The token's content when the signature matches, the purpose is the expected one and it has not expired; else null. */
function readToken(token, purpose, secret, now = Date.now()) {
  if (typeof token !== "string" || token.length > 2048) return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const payload = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(mac(payload, secret));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let body;
  try {
    body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (body.p !== purpose || !validEmail(normalizeEmail(body.e))) return null;
  if (purpose === "c" && !(typeof body.x === "number" && now <= body.x)) return null;
  return { email: normalizeEmail(body.e), locale: pickLocale(body.l) };
}

const localePrefix = (locale) => (locale === "fr" ? "/fr" : "");
const pageUrl = (locale, path) => `${SITE}${localePrefix(locale)}${path}`;
/** An action link. `l` (the language) only chooses the page an expired link lands on; the token carries the rest. */
const actionUrl = (action, token, locale) => `${SITE}/api/newsletter/${action}?t=${encodeURIComponent(token)}${locale === "fr" ? "&l=fr" : ""}`;

/* The words of the e-mails. They live here, not in messages/*.json, because the functions are deployed alone. */
const WORDS = {
  en: {
    confirmSubject: "Confirm your subscription to the Krizaka blog",
    confirmBody: (link) => `Hello,\n\nSomeone, probably you, asked to receive the new posts of the Krizaka blog (blog.krizaka.com) at this address.\n\nTo confirm, open this link (valid for 48 hours):\n${link}\n\nIf it wasn't you, ignore this e-mail: nothing was recorded, and you won't hear from us again.\n\nOussama`,
    postSubject: (title) => `New on the Krizaka blog: ${title}`,
    postBody: (title, description, link) => `${title}\n\n${description}\n\nRead it: ${link}\n\nOussama`,
    why: (date) => `You receive this e-mail because you subscribed to the new posts of blog.krizaka.com${date ? ` on ${date}` : ""} and confirmed it.`,
    whyConfirm: "You receive this e-mail because this address was entered in the subscription form of blog.krizaka.com.",
    unsubscribe: (link) => `Unsubscribe in one click: ${link}`,
    privacy: `What we keep and why: ${SITE}/newsletter/`,
    sender: (address) => `Sent by Technologies Krizaka Inc. (Krizaka), ${address}. Contact: https://www.krizaka.com/contact`,
  },
  fr: {
    confirmSubject: "Confirmez votre inscription au blogue Krizaka",
    confirmBody: (link) => `Bonjour,\n\nQuelqu'un, sans doute vous, a demandé à recevoir les nouveaux billets du blogue Krizaka (blog.krizaka.com) à cette adresse.\n\nPour confirmer, ouvrez ce lien (valable 48 heures) :\n${link}\n\nSi ce n'était pas vous, ignorez ce courriel : rien n'a été enregistré, et vous n'entendrez plus parler de nous.\n\nOussama`,
    postSubject: (title) => `Nouveau sur le blogue Krizaka : ${title}`,
    postBody: (title, description, link) => `${title}\n\n${description}\n\nLe lire : ${link}\n\nOussama`,
    why: (date) => `Vous recevez ce courriel parce que vous vous êtes inscrit aux nouveaux billets de blog.krizaka.com${date ? ` le ${date}` : ""} et que vous l'avez confirmé.`,
    whyConfirm: "Vous recevez ce courriel parce que cette adresse a été saisie dans le formulaire d'inscription de blog.krizaka.com.",
    unsubscribe: (link) => `Se désinscrire en un clic : ${link}`,
    privacy: `Ce que nous gardons et pourquoi : ${SITE}/fr/newsletter/`,
    sender: (address) => `Envoyé par Technologies Krizaka Inc. (Krizaka), ${address}. Contact : https://www.krizaka.com/fr/contact`,
  },
};

const senderAddress = (env) => (configured(env.MAIL_SENDER_ADDRESS) ? env.MAIL_SENDER_ADDRESS.trim() : "Montréal (Québec), Canada");

/** The footer every e-mail carries (CASL: who sends, how to reach them, why you get it, how to stop). */
function footer(locale, env, { why, unsubscribeLink }) {
  const w = WORDS[locale];
  return ["", "—", why, unsubscribeLink ? w.unsubscribe(unsubscribeLink) : null, w.privacy, w.sender(senderAddress(env))].filter((l) => l !== null).join("\n");
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A plain HTML version of a text e-mail: paragraphs, links clickable. No image, no tracking pixel. */
function toHtml(text) {
  const link = (s) => escapeHtml(s).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.5;max-width:36rem">${text
    .split("\n\n")
    .map((p) => `<p>${p.split("\n").map(link).join("<br>")}</p>`)
    .join("")}</body></html>`;
}

function confirmationEmail({ email, locale }, env, now = Date.now()) {
  const w = WORDS[locale];
  const link = actionUrl("confirm", makeToken({ email, locale, purpose: "c", now }, env.MAIL_TOKEN_SECRET), locale);
  const text = `${w.confirmBody(link)}\n${footer(locale, env, { why: w.whyConfirm })}`;
  return { to: email, subject: w.confirmSubject, text, html: toHtml(text) };
}

function newPostEmail({ email, locale, consentedAt }, post, env) {
  const w = WORDS[locale];
  const unsubscribeLink = actionUrl("unsubscribe", makeToken({ email, locale, purpose: "u" }, env.MAIL_TOKEN_SECRET));
  const text = `${w.postBody(post.title, post.description, post.url)}\n${footer(locale, env, { why: w.why(consentedAt ? String(consentedAt).slice(0, 10) : ""), unsubscribeLink })}`;
  return {
    to: email,
    subject: w.postSubject(post.title),
    text,
    html: toHtml(text),
    headers: { "List-Unsubscribe": `<${unsubscribeLink}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/* ---- Mailgun, through fetch (no SDK) ---- */
const api = (env) => (configured(env.MAIL_API_URL) ? env.MAIL_API_URL.trim() : "https://api.mailgun.net").replace(/\/$/, "");
const auth = (env) => `Basic ${Buffer.from(`api:${env.MAIL_API_KEY}`).toString("base64")}`;
const mailConfigured = (env) => ["MAIL_API_KEY", "MAIL_DOMAIN", "MAIL_FROM", "MAIL_NEWSLETTER_LIST", "MAIL_TOKEN_SECRET"].every((k) => configured(env[k]));

async function sendEmail(message, env, fetchImpl = fetch) {
  const form = new URLSearchParams({ from: env.MAIL_FROM, to: message.to, subject: message.subject, text: message.text, html: message.html, "o:tracking": "no" });
  for (const [k, v] of Object.entries(message.headers ?? {})) form.set(`h:${k}`, v);
  const res = await fetchImpl(`${api(env)}/v3/${env.MAIL_DOMAIN}/messages`, { method: "POST", headers: { Authorization: auth(env), "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  if (!res.ok) throw new Error(`mail ${res.status}`);
}

/** Adds (or updates) a confirmed subscriber, with the proof of consent. */
async function addMember({ email, locale }, env, now = new Date(), fetchImpl = fetch) {
  const vars = { locale, consentedAt: now.toISOString(), source: "blog.krizaka.com form, double opt-in" };
  const form = new URLSearchParams({ address: email, subscribed: "yes", upsert: "yes", vars: JSON.stringify(vars) });
  const res = await fetchImpl(`${api(env)}/v3/lists/${env.MAIL_NEWSLETTER_LIST}/members`, { method: "POST", headers: { Authorization: auth(env), "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  if (!res.ok) throw new Error(`list ${res.status}`);
}

/** Removes a subscriber. Already gone is fine (the link may be clicked twice). */
async function removeMember(email, env, fetchImpl = fetch) {
  const res = await fetchImpl(`${api(env)}/v3/lists/${env.MAIL_NEWSLETTER_LIST}/members/${encodeURIComponent(email)}`, { method: "DELETE", headers: { Authorization: auth(env) } });
  if (!res.ok && res.status !== 404) throw new Error(`list ${res.status}`);
}

/** Every confirmed subscriber: [{ email, locale, consentedAt }]. */
async function listMembers(env, fetchImpl = fetch) {
  const out = [];
  let url = `${api(env)}/v3/lists/${env.MAIL_NEWSLETTER_LIST}/members/pages?subscribed=yes&limit=100`;
  for (let page = 0; page < 1000 && url; page++) {
    const res = await fetchImpl(url, { headers: { Authorization: auth(env) } });
    if (!res.ok) throw new Error(`list ${res.status}`);
    const data = await res.json();
    if (!data.items?.length) break;
    for (const m of data.items) out.push({ email: m.address, locale: pickLocale(m.vars?.locale), consentedAt: m.vars?.consentedAt ?? null });
    url = data.paging?.next ?? null;
  }
  return out;
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const captchaConfigured = (env) => env.ABUSE_CAPTCHA_PROVIDER?.trim().toLowerCase() === "turnstile" && configured(env.ABUSE_CAPTCHA_SECRET_KEY);
/** True when the token is valid. Fails closed: configured or not, the subscription form needs it (a public form that sends e-mail). */
async function verifyCaptcha(token, ip, env, fetchImpl = fetch) {
  if (!captchaConfigured(env)) return false;
  if (typeof token !== "string" || !token.trim() || token.length > 4096) return false;
  const body = new URLSearchParams({ secret: env.ABUSE_CAPTCHA_SECRET_KEY.trim(), response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetchImpl(SITEVERIFY_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}

/** The visitor's address as the platform forwards it (first hop), or "". */
const clientIp = (args) => String(args?.__ow_headers?.["x-forwarded-for"] ?? "").split(",")[0].trim();
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const redirect = (location) => ({ statusCode: 303, headers: { Location: location, "Cache-Control": "no-store" }, body: "" });

module.exports = {
  SITE, LOCALES, CONFIRM_TTL_MS, configured, normalizeEmail, validEmail, pickLocale, makeToken, readToken, pageUrl, actionUrl,
  confirmationEmail, newPostEmail, footer, toHtml, sendEmail, addMember, removeMember, listMembers, mailConfigured,
  verifyCaptcha, captchaConfigured, clientIp, json, redirect, WORDS,
};
