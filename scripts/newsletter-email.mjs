/* The "new post" e-mail, designed once per language with @krizaka/email (the family's e-mail system: React Email,
   tables and inline styles, dark mode, one 600 px column, the Krizaka mark, a plain-text part, the CASL footer with the
   one-click unsubscribe). The workflow renders it, so the deployed function needs no React: it only fills in what is the
   reader's own (the unsubscribe token) and the sender's (the postal address, a function secret) — see
   functions/packages/newsletter/send/newsletter.js (fillRendered). */
import { renderEmail } from "@krizaka/email";

const SITE = "https://blog.krizaka.com";
/** The placeholders the function replaces, identical to its UNSUBSCRIBE_TOKEN and SENDER_ADDRESS (tests/newsletter.test.mjs). */
export const UNSUBSCRIBE_TOKEN = "__UNSUBSCRIBE_TOKEN__";
export const SENDER_ADDRESS = "__SENDER_ADDRESS__";
/** The widest cover an e-mail column can use, twice (600 px, retina). */
const COVER_WIDTH = 1200;

/** A value the template's schema bounds (a title, an excerpt): cut with an ellipsis rather than refuse the whole e-mail. */
const clip = (v, max) => (String(v).length > max ? `${String(v).slice(0, max - 1).trimEnd()}…` : String(v));

/** The cover of a post as an e-mail shows it: a WebP of about 1200 px (every e-mail client that matters reads WebP except
    Outlook for Windows, where the alt text stands in; AVIF is not read by Gmail). `media` is lib/media.json. */
export function coverOf(media, id) {
  const list = media?.[id]?.renditions?.webp;
  if (!Array.isArray(list) || !list.length) return undefined;
  const sorted = [...list].sort((a, b) => a.w - b.w);
  return (sorted.find((r) => r.w >= COVER_WIDTH) ?? sorted[sorted.length - 1]).url;
}

/** One language's e-mail: { subject, html, text, headers }, placeholders in place of the reader's own values. */
export async function renderPostEmail(locale, version) {
  const props = {
    title: clip(version.title, 200),
    excerpt: clip(version.description, 500),
    url: version.url,
    unsubscribeUrl: `${SITE}/api/newsletter/unsubscribe?t=${UNSUBSCRIBE_TOKEN}${locale === "fr" ? "&l=fr" : ""}`,
    address: SENDER_ADDRESS,
    links: { privacy: `${SITE}${locale === "fr" ? "/fr" : ""}/newsletter/` },
  };
  if (version.coverUrl) Object.assign(props, { coverUrl: version.coverUrl, coverAlt: clip(version.coverAlt || version.title, 200) });
  const mail = await renderEmail("newPost", props, { locale });
  return { subject: mail.subject, html: mail.html, text: mail.text };
}

/** The versions of a post with their designed e-mail added (`subject`, `html`, `text`), ready for the send action. */
export async function withRenderedEmails(versions) {
  const out = {};
  for (const [locale, v] of Object.entries(versions)) out[locale] = { ...v, ...(await renderPostEmail(locale, v)) };
  return out;
}

/** The image URLs of a rendered e-mail (what a client would fetch). */
export const imagesOf = (html) => [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

/** The placeholder of the signed token in the confirmation link, identical to the function's CONFIRM_TOKEN (tests/newsletter.test.mjs). */
export const CONFIRM_TOKEN = "__CONFIRM_TOKEN__";
/** The double opt-in e-mail (`newsletterConfirm`), once per language, with the token and the postal address left as placeholders
    for the subscribe function to fill. `hours` is the link's window (the function's CONFIRM_TTL_MS). */
export async function renderConfirmationEmail(locale, hours) {
  const props = {
    confirmUrl: `${SITE}/api/newsletter/confirm?t=${CONFIRM_TOKEN}${locale === "fr" ? "&l=fr" : ""}`,
    hours,
    address: SENDER_ADDRESS,
    links: { privacy: `${SITE}${locale === "fr" ? "/fr" : ""}/newsletter/` },
  };
  const mail = await renderEmail("newsletterConfirm", props, { locale });
  return { subject: mail.subject, html: mail.html, text: mail.text };
}
